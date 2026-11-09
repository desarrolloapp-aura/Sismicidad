"""Escribe líneas en arranque.log (misma carpeta que el supervisor)."""

from __future__ import annotations

import os
from datetime import datetime


def anotar_sala(mensaje: str) -> None:
    ruta = os.environ.get("SISMICO_LOG", "").strip()
    if not ruta:
        return
    try:
        linea = f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} {mensaje}\n"
        with open(ruta, "a", encoding="utf-8") as archivo:
            archivo.write(linea)
    except OSError:
        pass
