"""
Router de la API para sectores sísmicos.
Endpoints disponibles:
  GET /api/sectores/estado-actual  → último reporte en memoria (más rápido)
  GET /api/sectores/forzar-update  → fuerza un scraping inmediato
  GET /api/sectores/historial      → historial paginado desde SQLite
  GET /api/sectores/{nombre}       → historial de un sector específico
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import SectorSnapshot
from app.schemas import ReporteActual, HistorialResponse, SectorSnapshotOut
from app.scheduler import get_ultimo_reporte, _ejecutar_scraping

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sectores", tags=["Sectores Sísmicos"])


@router.get("/estado-actual", response_model=ReporteActual, summary="Estado actual de todos los sectores")
async def get_estado_actual():
    """
    Retorna el último reporte scrapeado (cacheado en memoria).
    Responde instantáneamente sin consultar GeoVita ni la DB.
    Si no hay datos aún (primer arranque), hace un scraping en el momento.
    """
    reporte = get_ultimo_reporte()

    if reporte is None:
        logger.info("Cache vacío — ejecutando scraping inicial...")
        await _ejecutar_scraping()
        reporte = get_ultimo_reporte()

    if reporte is None:
        raise HTTPException(status_code=503, detail="No se pudo obtener datos de GeoVita")

    return reporte


@router.get("/forzar-update", response_model=ReporteActual, summary="Forzar actualización inmediata")
async def forzar_actualizacion():
    """
    Fuerza un scraping inmediato de GeoVita, sin esperar el ciclo del scheduler.
    Útil para pruebas o cuando se necesita dato fresco urgente.
    """
    await _ejecutar_scraping()
    reporte = get_ultimo_reporte()
    if reporte is None:
        raise HTTPException(status_code=503, detail="No se pudo obtener datos de GeoVita")
    return reporte


@router.get("/historial", response_model=HistorialResponse, summary="Historial paginado de estados")
def get_historial(
    page: int = Query(default=1, ge=1, description="Número de página"),
    page_size: int = Query(default=50, ge=1, le=500, description="Registros por página"),
    sector: Optional[str] = Query(default=None, description="Filtrar por nombre de sector"),
    estado: Optional[str] = Query(default=None, description="Filtrar por estado: ok | danger"),
    db: Session = Depends(get_db),
):
    """
    Retorna el historial de estados guardados en SQLite.
    Permite filtrar por sector y/o estado.
    """
    query = db.query(SectorSnapshot)

    if sector:
        query = query.filter(SectorSnapshot.nombre.ilike(f"%{sector}%"))
    if estado:
        query = query.filter(SectorSnapshot.estado == estado)

    total = query.count()
    offset = (page - 1) * page_size
    registros = (
        query.order_by(desc(SectorSnapshot.timestamp_scraping))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return HistorialResponse(
        total=total,
        page=page,
        page_size=page_size,
        datos=[SectorSnapshotOut.model_validate(r) for r in registros],
    )


@router.get("/{nombre_sector}", response_model=HistorialResponse, summary="Historial de un sector específico")
def get_historial_sector(
    nombre_sector: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Retorna el historial de un sector específico por nombre.
    La búsqueda es case-insensitive y parcial (contiene).
    """
    query = db.query(SectorSnapshot).filter(
        SectorSnapshot.nombre.ilike(f"%{nombre_sector}%")
    )

    total = query.count()
    if total == 0:
        raise HTTPException(status_code=404, detail=f"Sector '{nombre_sector}' no encontrado")

    offset = (page - 1) * page_size
    registros = (
        query.order_by(desc(SectorSnapshot.timestamp_scraping))
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return HistorialResponse(
        total=total,
        page=page,
        page_size=page_size,
        datos=[SectorSnapshotOut.model_validate(r) for r in registros],
    )


@router.get("/{nombre_sector}/tendencia", summary="Datos cronológicos para graficar")
def get_tendencia_sector(
    nombre_sector: str,
    limit: int = Query(default=60, ge=1, le=1440, description="Puntos de datos a retornar (ej. últimos 60 minutos)"),
    db: Session = Depends(get_db),
):
    """
    Retorna los últimos 'limit' registros de un sector en orden CRONOLÓGICO ascendente.
    Ideal para dibujar gráficos de líneas de evolución temporal.
    """
    query = db.query(SectorSnapshot).filter(
        SectorSnapshot.nombre.ilike(f"%{nombre_sector}%")
    )
    
    total = query.count()
    if total == 0:
        raise HTTPException(status_code=404, detail=f"Sector '{nombre_sector}' no encontrado")

    # Tomar los más recientes pero ordenados cronológicamente
    registros = (
        query.order_by(desc(SectorSnapshot.timestamp_scraping))
        .limit(limit)
        .all()
    )
    
    # Invertir para que queden ascendentes (más antiguo primero -> más reciente al final)
    registros.reverse()

    return [SectorSnapshotOut.model_validate(r) for r in registros]
