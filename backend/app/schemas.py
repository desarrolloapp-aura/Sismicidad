"""
Schemas Pydantic para validación y serialización de datos.
Define la estructura de los datos que viajan por la API.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class SectorEstado(BaseModel):
    """Estado actual de un polígono sísmico (salida del lector Codelco)."""
    nombre: str
    estado: str                  # "ok" | "danger"
    estado_label: str            # "Centro" | "Inferior" | "Superior"
    grupo: str = "Esta etapa"
    principal: bool = False
    grafico_24h: Optional[str] = None
    frec_24h: Optional[str] = None
    mag_min_24h: Optional[str] = None
    mag_max_24h: Optional[str] = None
    z_min_24h: Optional[str] = None
    z_max_24h: Optional[str] = None
    grafico_7d: Optional[str] = None
    frec_7d: Optional[str] = None
    mag_min_7d: Optional[str] = None
    mag_max_7d: Optional[str] = None
    z_min_7d: Optional[str] = None
    z_max_7d: Optional[str] = None
    ultimo_cambio: Optional[str] = None
    tiempo_en_estado: Optional[str] = None
    duracion_centro: Optional[str] = None
    duracion_inferior: Optional[str] = None
    duracion_superior: Optional[str] = None

    class Config:
        from_attributes = True


class ReporteActual(BaseModel):
    """Respuesta completa del endpoint /api/estado-actual."""
    timestamp_geovita: Optional[datetime]
    timestamp_consulta: datetime
    sectores: List[SectorEstado]
    total_ok: int
    total_danger: int
    fuente_url: str
    fuente: str = "copia_local"          # "en_vivo" | "copia_local"
    sistema_ims: Optional[str] = None


class SectorSnapshotOut(BaseModel):
    """Registro histórico de un sector (para el endpoint /api/historial)."""
    id: int
    nombre: str
    estado: str
    estado_label: str
    ultimo_cambio: Optional[str]
    tiempo_en_estado: Optional[str]
    duracion_centro: Optional[str]
    duracion_inferior: Optional[str]
    duracion_superior: Optional[str]
    grupo: Optional[str] = None
    principal: Optional[bool] = None
    frec_24h: Optional[str] = None
    mag_min_24h: Optional[str] = None
    mag_max_24h: Optional[str] = None
    z_min_24h: Optional[str] = None
    z_max_24h: Optional[str] = None
    frec_7d: Optional[str] = None
    mag_min_7d: Optional[str] = None
    mag_max_7d: Optional[str] = None
    z_min_7d: Optional[str] = None
    z_max_7d: Optional[str] = None
    timestamp_geovita: Optional[datetime]
    timestamp_scraping: datetime

    class Config:
        from_attributes = True


class HistorialResponse(BaseModel):
    """Respuesta paginada del historial."""
    total: int
    page: int
    page_size: int
    datos: List[SectorSnapshotOut]
