"""Dónde corre este programa: en la mina, en la oficina, o solo con la copia local."""

import os
from pathlib import Path

# local   → este PC intenta Codelco y, si no llega, usa el HTML guardado
# mina    → PC en la red de El Teniente. Solo lee la página en vivo.
# oficina → no lee Codelco. Trae el último reporte del PC de la mina.
MODO = os.environ.get("SISMICO_MODO", "local").strip().lower()

# Dirección del backend que corre en el PC de la mina. Ejemplo:
# http://100.x.x.x:8030
PUENTE_URL = os.environ.get("PUENTE_URL", "").strip().rstrip("/")

# Página en Cloudflare que guarda el último reporte.
PAGINA_URL = os.environ.get(
    "PAGINA_URL", "https://sismicidad.desarrolloapp.workers.dev"
).strip().rstrip("/")


def _leer_secreto() -> str:
    valor = os.environ.get("PUENTE_SECRETO", "").strip()
    if valor:
        return valor
    archivo = Path(__file__).resolve().parents[2] / "puente.secreto"
    try:
        return archivo.read_text(encoding="utf-8-sig").strip()
    except OSError:
        return ""


# Clave compartida con la página; está en puente.secreto junto al .bat.
PUENTE_SECRETO = _leer_secreto()

# Cada cuánto el PC de la mina deja en la página su respaldo de 7 días.
RESPALDO_MINUTOS = 5
