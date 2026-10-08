"""
Lee el Sistema Sísmico El Teniente (Codelco, red interna).

Primero intenta http://10.18.18.83:8008/hdis1/resumen/.
Si esa red no está disponible, usa la página guardada en la carpeta del proyecto.
Los valores de la tabla vienen dibujados en imágenes y se leen en ocr_celdas.
"""

from __future__ import annotations

import logging
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.config import MODO
from app.ocr_celdas import leer_estado, leer_numero
from app.poligonos import POLIGONOS, buscar_poligono
from app.schemas import ReporteActual, SectorEstado

logger = logging.getLogger(__name__)

CODELCO_URL = "http://10.18.18.83:8008/hdis1/resumen/"
PROYECTO = Path(__file__).resolve().parents[2]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_zip_cache: dict[str, bytes] | None = None


def _pagina_guardada() -> Path:
    carpetas = [PROYECTO / "datos" / "pagina-guardada", PROYECTO]
    htmls = []
    for carpeta in carpetas:
        if carpeta.is_dir():
            htmls.extend(ruta for ruta in carpeta.glob("*.html") if "Teniente" in ruta.name)
    if not htmls:
        raise FileNotFoundError("No está la página guardada del Sistema Sísmico El Teniente")
    return htmls[0]


def _imagenes_zip() -> dict[str, bytes]:
    global _zip_cache
    if _zip_cache is not None:
        return _zip_cache
    zips = []
    for carpeta in (PROYECTO / "datos" / "pagina-guardada", PROYECTO):
        if carpeta.is_dir():
            zips.extend(
                ruta for ruta in carpeta.glob("*.zip")
                if "files" in ruta.name or "Teniente" in ruta.name
            )
    if not zips:
        _zip_cache = {}
        return _zip_cache
    archivos: dict[str, bytes] = {}
    with zipfile.ZipFile(zips[0]) as paquete:
        for nombre in paquete.namelist():
            if nombre.lower().endswith(".png"):
                archivos[Path(nombre).name.lower()] = paquete.read(nombre)
    _zip_cache = archivos
    return archivos


def _bytes_imagen_local(src: str) -> bytes | None:
    nombre = Path(src.split("?")[0]).name.lower()
    carpeta = _pagina_guardada().parent / (_pagina_guardada().stem + "_files")
    directa = carpeta / Path(src).name
    if directa.is_file():
        return directa.read_bytes()
    return _imagenes_zip().get(nombre)


async def _bytes_imagen(src: str, base_url: str | None, cliente: httpx.AsyncClient | None) -> bytes | None:
    if src.startswith("http") and cliente is not None:
        try:
            respuesta = await cliente.get(src)
            respuesta.raise_for_status()
            return respuesta.content
        except httpx.HTTPError as exc:
            logger.warning("No se pudo bajar %s: %s", src, exc)
            return None
    if base_url and cliente is not None and not src.startswith("data:"):
        try:
            respuesta = await cliente.get(urljoin(base_url, src))
            respuesta.raise_for_status()
            return respuesta.content
        except httpx.HTTPError:
            pass
    return _bytes_imagen_local(src)


def _texto_actualizacion(soup: BeautifulSoup) -> datetime | None:
    caja = soup.find(id="more")
    texto = caja.get_text(" ", strip=True) if caja else soup.get_text(" ", strip=True)
    match = re.search(r"Actualizaci[oó]n\s+(\d{4}/\d{2}/\d{2})\s+(\d{2}:\d{2}:\d{2})", texto)
    if not match:
        return None
    try:
        return datetime.strptime(f"{match.group(1)} {match.group(2)}", "%Y/%m/%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        return None


def _estado_ims(soup: BeautifulSoup) -> str | None:
    caja = soup.find(id="more")
    if not caja:
        return None
    match = re.search(r"Estado:\s*(.+)", caja.get_text("\n", strip=True))
    if not match:
        return None
    return match.group(1).split("\n")[0].strip()


def _src_img(celda) -> str | None:
    imagen = celda.find("img") if celda else None
    if imagen and imagen.get("src"):
        return imagen["src"]
    return None


def _href(celda) -> str | None:
    enlace = celda.find("a") if celda else None
    if enlace and enlace.get("href"):
        return enlace["href"]
    return None


async def _leer_tabla(html: str, base_url: str | None, cliente: httpx.AsyncClient | None) -> list[SectorEstado]:
    soup = BeautifulSoup(html, "lxml")
    encontrados: dict[str, SectorEstado] = {}

    for fila in soup.find_all("tr"):
        celdas = fila.find_all("td", recursive=False)
        if len(celdas) < 14:
            continue
        enlace = celdas[0].find("a")
        if not enlace:
            continue
        nombre = enlace.get_text(strip=True)
        ficha = buscar_poligono(nombre)
        if ficha is None:
            continue

        estado_bytes = await _bytes_imagen(_src_img(celdas[1]) or "", base_url, cliente)
        if not estado_bytes:
            logger.warning("Sin imagen de estado para %s", nombre)
            continue
        estado_label, estado = leer_estado(estado_bytes)

        async def numero(indice: int) -> str | None:
            src = _src_img(celdas[indice])
            if not src:
                return None
            raw = await _bytes_imagen(src, base_url, cliente)
            if not raw:
                return None
            return leer_numero(raw)

        sector = SectorEstado(
            nombre=ficha["nombre"],
            estado=estado,
            estado_label=estado_label,
            grupo=ficha["grupo"],
            principal=ficha["principal"],
            grafico_24h=_href(celdas[2]),
            frec_24h=await numero(3),
            mag_min_24h=await numero(4),
            mag_max_24h=await numero(5),
            z_min_24h=await numero(6),
            z_max_24h=await numero(7),
            grafico_7d=_href(celdas[8]),
            frec_7d=await numero(9),
            mag_min_7d=await numero(10),
            mag_max_7d=await numero(11),
            z_min_7d=await numero(12),
            z_max_7d=await numero(13),
        )
        encontrados[_norm_nombre(ficha["nombre"])] = sector

    ordenados = []
    for ficha in POLIGONOS:
        sector = encontrados.get(_norm_nombre(ficha["nombre"]))
        if sector:
            ordenados.append(sector)
        else:
            logger.warning("No apareció en la tabla: %s", ficha["nombre"])
    return ordenados, soup


def _norm_nombre(nombre: str) -> str:
    return " ".join(nombre.lower().split())


async def _desde_html(html: str, base_url: str | None, fuente: str, cliente: httpx.AsyncClient | None) -> ReporteActual:
    sectores, soup = await _leer_tabla(html, base_url, cliente)
    total_ok = sum(1 for sector in sectores if sector.estado == "ok")
    total_danger = sum(1 for sector in sectores if sector.estado == "danger")
    return ReporteActual(
        timestamp_geovita=_texto_actualizacion(soup),
        timestamp_consulta=datetime.now(timezone.utc),
        sectores=sectores,
        total_ok=total_ok,
        total_danger=total_danger,
        fuente_url=CODELCO_URL if fuente == "en_vivo" else str(_pagina_guardada()),
        fuente=fuente,
        sistema_ims=_estado_ims(soup),
    )


async def scrapear_sismicidad() -> ReporteActual:
    """Descarga el resumen de Codelco o, si no hay red de mina, la copia guardada."""
    try:
        async with httpx.AsyncClient(timeout=4.0, headers=HEADERS, follow_redirects=True) as cliente:
            respuesta = await cliente.get(CODELCO_URL)
            respuesta.raise_for_status()
            logger.info("Lectura en vivo de %s", CODELCO_URL)
            return await _desde_html(respuesta.text, CODELCO_URL, "en_vivo", cliente)
    except Exception as exc:
        if MODO == "mina":
            logger.error("El PC de la mina no pudo leer Codelco (%s).", exc or type(exc).__name__)
            raise
        logger.warning("Red Codelco no disponible (%s). Se usa la página guardada.", exc or type(exc).__name__)

    html = _pagina_guardada().read_text(encoding="utf-8", errors="replace")
    return await _desde_html(html, None, "copia_local", None)


async def scrapear_geovita() -> ReporteActual:
    """Lee el sistema sísmico de Codelco."""
    return await scrapear_sismicidad()
