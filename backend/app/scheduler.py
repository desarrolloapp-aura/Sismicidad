"""
Scheduler de background tasks.
Lee la tabla de Codelco automáticamente cada 60 segundos
y guarda los resultados en la base de datos SQLite.
"""

import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

import httpx

from app.config import MODO, PUENTE_URL
from app.schemas import ReporteActual
from app.scraper import scrapear_geovita
from app.database import SessionLocal
from app.models import SectorSnapshot

logger = logging.getLogger(__name__)

# Cache en memoria con el último reporte (para responder instantáneo sin DB)
ultimo_reporte = None
scheduler = AsyncIOScheduler()


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


async def _ejecutar_scraping():
    """
    Tarea periódica: lee Codelco y guarda el resultado en SQLite.
    """
    global ultimo_reporte

    try:
        if MODO == "oficina":
            reporte = await _traer_desde_puente()
        else:
            reporte = await scrapear_geovita()
        ultimo_reporte = reporte

        # Guardar en base de datos
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

    except Exception as e:
        logger.error(f"❌ Error en scraping: {e}")


def get_ultimo_reporte():
    """Retorna el último reporte cacheado en memoria."""
    return ultimo_reporte


def iniciar_scheduler():
    """Inicia el scheduler con intervalo de 60 segundos."""
    scheduler.add_job(
        _ejecutar_scraping,
        trigger=IntervalTrigger(seconds=60),
        id="lectura_codelco",
        name="Lectura Codelco",
        replace_existing=True,
        max_instances=1,        # Evita ejecuciones solapadas
    )
    scheduler.start()
    logger.info("🕐 Scheduler iniciado — scraping cada 60 segundos")


def detener_scheduler():
    """Detiene el scheduler al cerrar la aplicación."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Scheduler detenido")
