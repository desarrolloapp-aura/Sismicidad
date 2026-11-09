"""
Scheduler de background tasks.
Lee la tabla de Codelco automáticamente cada 60 segundos
y guarda los resultados en la base de datos SQLite.
"""

import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

import httpx

from app.config import MODO, PAGINA_URL, PUENTE_SECRETO, PUENTE_URL, RESPALDO_MINUTOS
from app.schemas import ReporteActual, SectorSnapshotOut
from app.scraper import scrapear_geovita
from app.database import SessionLocal
from app.models import SectorSnapshot
from app.sala_log import anotar_sala
from app.tendencia import leer_tendencia

logger = logging.getLogger(__name__)

# Cache en memoria con el último reporte (para responder instantáneo sin DB)
ultimo_reporte = None
ultimo_respaldo = None
_historial_recuperado = False
_siguiente_lectura = None
_sin_red_codelco = False
scheduler = AsyncIOScheduler()

CAMPOS_RESPALDO = (
    "id", "nombre", "estado", "estado_label", "frec_24h", "mag_min_24h",
    "mag_max_24h", "frec_7d", "timestamp_scraping",
)


async def _enviar_respaldo(reporte: ReporteActual):
    """Deja en la página el último reporte y los últimos 7 días, para cuando se corte el puente."""
    global ultimo_respaldo

    ahora = datetime.now(timezone.utc)
    if ultimo_respaldo and (ahora - ultimo_respaldo).total_seconds() < RESPALDO_MINUTOS * 60:
        return
    if not PUENTE_SECRETO:
        logger.warning("Falta puente.secreto; no se envía el respaldo a la página.")
        return

    db = SessionLocal()
    try:
        filas = []
        for sector in reporte.sectores:
            for registro in leer_tendencia(db, sector.nombre, horas=168, puntos=300):
                dato = SectorSnapshotOut.model_validate(registro).model_dump(mode="json", include=set(CAMPOS_RESPALDO))
                filas.append(dato)
    finally:
        db.close()

    cuerpo = {"reporte": reporte.model_dump(mode="json"), "filas": filas}
    try:
        async with httpx.AsyncClient(timeout=30.0) as cliente:
            respuesta = await cliente.post(
                f"{PAGINA_URL}/api/respaldo",
                json=cuerpo,
                headers={"x-puente-secreto": PUENTE_SECRETO},
            )
            respuesta.raise_for_status()
        ultimo_respaldo = ahora
        logger.info("Respaldo enviado a la página (%s lecturas)", len(filas))
    except Exception as e:
        logger.error(f"❌ No se pudo enviar el respaldo a la página: {e}")


async def _traer_desde_puente() -> ReporteActual:
    """Pide el reporte al PC de la mina y lo deja como estado actual de esta app."""
    if not PUENTE_URL:
        raise RuntimeError("Falta PUENTE_URL con la dirección del PC de la mina")
    async with httpx.AsyncClient(timeout=20.0) as cliente:
        respuesta = await cliente.get(f"{PUENTE_URL}/api/sectores/estado-actual")
        respuesta.raise_for_status()
    reporte = ReporteActual.model_validate(respuesta.json())
    logger.info("Reporte recibido del PC de la mina (%s)", PUENTE_URL)
    return reporte


def _momento(valor):
    if isinstance(valor, datetime):
        return valor.replace(tzinfo=None)
    if not valor:
        return None
    try:
        return datetime.fromisoformat(str(valor).replace("Z", ""))
    except ValueError:
        return None


async def _recuperar_historial():
    """Una carpeta nueva trae la base vacía. Antes de leer, copia lo que la página ya guardó."""
    global _historial_recuperado
    if _historial_recuperado or MODO != "mina" or not PUENTE_SECRETO:
        return
    try:
        async with httpx.AsyncClient(timeout=30.0) as cliente:
            respuesta = await cliente.get(
                f"{PAGINA_URL}/api/respaldo",
                headers={"x-puente-secreto": PUENTE_SECRETO},
            )
            respuesta.raise_for_status()
        filas = respuesta.json().get("filas") or []
    except Exception as e:
        logger.error(f"No se pudo recuperar el historial de la página: {e}")
        return

    _historial_recuperado = True
    if not filas:
        return

    db = SessionLocal()
    try:
        existentes = {
            (nombre, _momento(ts))
            for nombre, ts in db.query(SectorSnapshot.nombre, SectorSnapshot.timestamp_scraping).all()
        }
        nuevos = 0
        for fila in filas:
            nombre = fila.get("nombre")
            momento = _momento(fila.get("timestamp_scraping"))
            if not nombre or momento is None or not fila.get("estado") or not fila.get("estado_label"):
                continue
            if (nombre, momento) in existentes:
                continue
            db.add(SectorSnapshot(
                nombre=nombre,
                estado=fila["estado"],
                estado_label=fila["estado_label"],
                frec_24h=fila.get("frec_24h"),
                mag_min_24h=fila.get("mag_min_24h"),
                mag_max_24h=fila.get("mag_max_24h"),
                frec_7d=fila.get("frec_7d"),
                timestamp_scraping=momento,
            ))
            existentes.add((nombre, momento))
            nuevos += 1
        db.commit()
        if nuevos:
            logger.info("Historial recuperado de la página: %s lecturas", nuevos)
    except Exception as e:
        db.rollback()
        logger.error(f"No se pudo guardar el historial recuperado: {e}")
    finally:
        db.close()


async def _ejecutar_scraping():
    """
    Tarea periódica: lee Codelco y guarda el resultado en SQLite.
    Con la red caída reintenta en 10 segundos. Si la lectura salió, espera un minuto.
    """
    global ultimo_reporte, _siguiente_lectura, _sin_red_codelco
    ahora = datetime.now(timezone.utc)
    if _siguiente_lectura and ahora < _siguiente_lectura:
        return

    try:
        if MODO == "mina":
            await _recuperar_historial()
        if MODO == "oficina":
            reporte = await _traer_desde_puente()
        else:
            reporte = await scrapear_geovita()
        ultimo_reporte = reporte

        if reporte.fuente != "en_vivo":
            logger.info("Se usa la copia guardada; no se agrega al historial.")
            _sin_red_codelco = True
            anotar_sala("Sin red Codelco. Reconectando en 10 s.")
            _siguiente_lectura = ahora + timedelta(seconds=10)
            return

        if _sin_red_codelco:
            anotar_sala("Red Codelco recuperada.")
            _sin_red_codelco = False

        db = SessionLocal()
        try:
            for sector in reporte.sectores:
                snapshot = SectorSnapshot(
                    nombre=sector.nombre,
                    estado=sector.estado,
                    estado_label=sector.estado_label,
                    ultimo_cambio=sector.ultimo_cambio,
                    tiempo_en_estado=sector.tiempo_en_estado,
                    duracion_centro=sector.duracion_centro,
                    duracion_inferior=sector.duracion_inferior,
                    duracion_superior=sector.duracion_superior,
                    grupo=sector.grupo,
                    principal=1 if sector.principal else 0,
                    frec_24h=sector.frec_24h,
                    mag_min_24h=sector.mag_min_24h,
                    mag_max_24h=sector.mag_max_24h,
                    z_min_24h=sector.z_min_24h,
                    z_max_24h=sector.z_max_24h,
                    frec_7d=sector.frec_7d,
                    mag_min_7d=sector.mag_min_7d,
                    mag_max_7d=sector.mag_max_7d,
                    z_min_7d=sector.z_min_7d,
                    z_max_7d=sector.z_max_7d,
                    timestamp_geovita=reporte.timestamp_geovita,
                    timestamp_scraping=datetime.now(timezone.utc),
                )
                db.add(snapshot)
            db.commit()
            logger.info(f"✅ {len(reporte.sectores)} sectores guardados en DB")
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error guardando en DB: {e}")
        finally:
            db.close()

        if MODO == "mina":
            await _enviar_respaldo(reporte)
        _siguiente_lectura = datetime.now(timezone.utc) + timedelta(seconds=60)

    except Exception as e:
        _siguiente_lectura = datetime.now(timezone.utc) + timedelta(seconds=10)
        _sin_red_codelco = True
        anotar_sala("Sin red Codelco. Reconectando en 10 s.")
        logger.error(f"❌ Error en scraping: {e}")


def get_ultimo_reporte():
    """Retorna el último reporte cacheado en memoria."""
    return ultimo_reporte


def iniciar_scheduler():
    """Revisa seguido. La lectura real queda cada minuto, y a los 10 segundos si se cortó."""
    scheduler.add_job(
        _ejecutar_scraping,
        trigger=IntervalTrigger(seconds=10),
        id="lectura_codelco",
        name="Lectura Codelco",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — reintento a los 10 segundos si se corta la red")


def detener_scheduler():
    """Detiene el scheduler al cerrar la aplicación."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Scheduler detenido")
