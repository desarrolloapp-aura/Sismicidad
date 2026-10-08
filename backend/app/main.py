"""
Punto de entrada principal de la aplicación FastAPI.
Monitoreo Sísmico - Mina El Teniente (Plataforma GeoVita)
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.database import init_db
from app.scheduler import iniciar_scheduler, detener_scheduler, _ejecutar_scraping
from app.routers import sectores

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Lifespan (startup / shutdown) ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestiona el ciclo de vida de la aplicación."""
    logger.info("🚀 Iniciando Plataforma de Monitoreo Sísmico El Teniente...")

    # 1. Crear tablas en la DB
    init_db()
    logger.info("✅ Base de datos inicializada")

    # 2. Scraping inicial inmediato (para tener datos desde el primer request)
    logger.info("Leyendo el sistema sísmico de Codelco.")
    await _ejecutar_scraping()

    # 3. Iniciar scheduler (cada 60s)
    iniciar_scheduler()

    yield  # La app corre aquí

    # Cleanup al apagar
    detener_scheduler()
    logger.info("👋 Aplicación detenida correctamente")


# ─── App FastAPI ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="Monitoreo Sísmico El Teniente",
    description=(
        "API para monitoreo en tiempo real del estado sísmico de los sectores "
        "de la Mina El Teniente. Datos leídos del Sistema Sísmico Codelco (HDIS)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En producción, restringir al dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(sectores.router)

# ─── Servir Frontend estático ────────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        """Sirve el index.html del frontend."""
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        return FileResponse(index_path)


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Sistema"], summary="Health check")
async def health_check():
    return {
        "status": "ok",
        "servicio": "Monitoreo Sísmico El Teniente",
        "version": "1.0.0",
    }
