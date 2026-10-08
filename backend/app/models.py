"""
Modelos de base de datos para el monitoreo sísmico.
"""

from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func
from app.database import Base


class SectorSnapshot(Base):
    """
    Guarda cada lectura de estado de un sector sísmico.
    Permite construir histórico y detectar cambios de estado.
    """
    __tablename__ = "sector_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    # Identificación del sector
    nombre = Column(String, nullable=False, index=True)

    # Estado: "ok" | "danger"
    estado = Column(String, nullable=False)

    # Etiqueta del estado: "Centro" | "Inferior" | "Superior"
    estado_label = Column(String, nullable=False)

    # Datos de tiempo en el estado actual
    ultimo_cambio = Column(String, nullable=True)       # Ej: "21:53"
    tiempo_en_estado = Column(String, nullable=True)    # Ej: "95d 10h 52m"

    # Distribución últimas 24h (en horas como float para gráficos)
    duracion_centro = Column(String, nullable=True)     # Ej: "24:00 hrs"
    duracion_inferior = Column(String, nullable=True)   # Ej: "00:00 hrs"
    duracion_superior = Column(String, nullable=True)   # Ej: "00:00 hrs"

    grupo = Column(String, nullable=True)
    principal = Column(Integer, nullable=True)
    frec_24h = Column(String, nullable=True)
    mag_min_24h = Column(String, nullable=True)
    mag_max_24h = Column(String, nullable=True)
    z_min_24h = Column(String, nullable=True)
    z_max_24h = Column(String, nullable=True)
    frec_7d = Column(String, nullable=True)
    mag_min_7d = Column(String, nullable=True)
    mag_max_7d = Column(String, nullable=True)
    z_min_7d = Column(String, nullable=True)
    z_max_7d = Column(String, nullable=True)

    # Metadatos del scraping
    timestamp_geovita = Column(DateTime, nullable=True)     # Hora que informa la tabla de Codelco
    timestamp_scraping = Column(DateTime, server_default=func.now(), nullable=False)  # Cuándo lo capturamos

    def __repr__(self):
        return f"<SectorSnapshot(nombre='{self.nombre}', estado='{self.estado}', ts='{self.timestamp_scraping}')>"
