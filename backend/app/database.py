"""
Configuración de base de datos SQLite con SQLAlchemy.
Guarda el histórico de estados de los sectores sísmicos.
"""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Ruta de la base de datos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "..", "data", "sismicidad.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Necesario para SQLite con FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependencia para inyectar sesión de base de datos en los endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


_COLUMNAS_NUEVAS = {
    "grupo": "VARCHAR",
    "principal": "INTEGER",
    "frec_24h": "VARCHAR",
    "mag_min_24h": "VARCHAR",
    "mag_max_24h": "VARCHAR",
    "z_min_24h": "VARCHAR",
    "z_max_24h": "VARCHAR",
    "frec_7d": "VARCHAR",
    "mag_min_7d": "VARCHAR",
    "mag_max_7d": "VARCHAR",
    "z_min_7d": "VARCHAR",
    "z_max_7d": "VARCHAR",
}


def init_db():
    """Crea todas las tablas si no existen y agrega columnas nuevas."""
    from app.models import SectorSnapshot  # noqa: F401
    Base.metadata.create_all(bind=engine)
    existentes = {col["name"] for col in inspect(engine).get_columns("sector_snapshots")}
    with engine.begin() as conexion:
        for nombre, tipo in _COLUMNAS_NUEVAS.items():
            if nombre not in existentes:
                conexion.execute(text(f"ALTER TABLE sector_snapshots ADD COLUMN {nombre} {tipo}"))
