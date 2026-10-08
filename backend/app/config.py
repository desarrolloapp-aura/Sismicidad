"""Dónde corre este programa: en la mina, en la oficina, o solo con la copia local."""

import os

# local   → este PC intenta Codelco y, si no llega, usa el HTML guardado
# mina    → PC en la red de El Teniente. Solo lee la página en vivo.
# oficina → no lee Codelco. Trae el último reporte del PC de la mina.
MODO = os.environ.get("SISMICO_MODO", "local").strip().lower()

# Dirección del backend que corre en el PC de la mina. Ejemplo:
# http://100.x.x.x:8030
PUENTE_URL = os.environ.get("PUENTE_URL", "").strip().rstrip("/")
