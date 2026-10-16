"""Lecturas de un polígono en una ventana de horas, reducidas para graficar."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import asc, func
from sqlalchemy.orm import Session

from app.models import SectorSnapshot


def leer_tendencia(db: Session, nombre: str, horas: int, puntos: int) -> list[SectorSnapshot]:
    desde = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=horas)
    registros = (
        db.query(SectorSnapshot)
        .filter(func.lower(SectorSnapshot.nombre) == nombre.lower())
        .filter(SectorSnapshot.timestamp_scraping >= desde)
        .order_by(asc(SectorSnapshot.timestamp_scraping))
        .all()
    )
    if len(registros) <= puntos:
        return registros
    paso = len(registros) / puntos
    indices = {int(i * paso) for i in range(puntos)}
    indices.add(len(registros) - 1)
    indices.update(
        i for i in range(1, len(registros))
        if registros[i].estado != registros[i - 1].estado
    )
    return [registros[i] for i in sorted(indices)]
