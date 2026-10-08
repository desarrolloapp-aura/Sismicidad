"""
Lee las imágenes de las celdas del Sistema Sísmico El Teniente.

En esa página el estado (Centro / Inferior / Superior) y los números
no vienen como texto: cada celda es un PNG con el valor dibujado.
"""

from __future__ import annotations

import io
from typing import Iterable

from PIL import Image

# Dígitos recortados de la copia guardada de la página (fuente de la tabla).
_DIGITOS = {
    "0": """
..#####.
.######.
.##...##
.##...##
###...##
###...##
##....##
###...##
.##...##
.##...##
.######.
..#####.
""",
    "1": """
...##
...##
#####
#####
...##
...##
...##
...##
...##
...##
...##
...##
""",
    "2": """
..#####.
.#######
.##...##
.##...##
......##
.....###
....###.
..####..
.###....
.##.....
########
########
""",
    "3": """
..#####.
.#######
.##...##
.##...##
.....###
...####.
....####
......##
##....##
###...##
.#######
..#####.
""",
    "4": """
.....##..
....###..
....###..
...####..
..##.##..
..##.##..
.##..##..
##...##..
#########
.#######.
.....##..
.....##..
""",
    "5": """
.#######
.#######
.##.....
.##.....
.######.
.#######
.#....##
......##
.#....##
###...##
.#######
..#####.
""",
    "6": """
..#####.
.#######
.##...##
.##.....
.######.
########
###...##
###...##
.##...##
.##...##
.#######
..#####.
""",
    "7": """
#########
.#######.
......##.
.....##..
.....##..
....##...
....##...
...##....
...##....
...##....
..##.....
..##.....
""",
    "8": """
..#####..
.#######.
.##...##.
.##...##.
.###.###.
..#####..
.#######.
###...##.
##....###
###...##.
.#######.
..#####..
""",
    "9": """
..#####.
.#######
.##...##
##....##
###...##
.###.###
.#######
......##
.#....##
.##...##
.######.
..####..
""",
}


def _plantilla(texto: str) -> list[list[bool]]:
    filas = [linea for linea in texto.strip("\n").splitlines()]
    return [[ch == "#" for ch in linea] for linea in filas]


_ALTERNOS = [
    (
        "4",
        """
....##..
...###..
...###..
..####..
.##.##..
.##.##..
##..##..
#...##..
########
#######.
....##..
....##..
""",
    ),
]

_TEMPLATES = [(digito, _plantilla(arte)) for digito, arte in _DIGITOS.items()]
_TEMPLATES += [(digito, _plantilla(arte)) for digito, arte in _ALTERNOS]


def _tinta(raw: bytes) -> list[list[bool]]:
    imagen = Image.open(io.BytesIO(raw)).convert("RGBA")
    ancho, alto = imagen.size
    pixeles = imagen.load()
    return [[pixeles[x, y][3] > 40 for x in range(ancho)] for y in range(alto)]


def _recortar(tinta: list[list[bool]]) -> list[list[bool]]:
    if not tinta or not tinta[0]:
        return []
    alto, ancho = len(tinta), len(tinta[0])
    filas = [y for y in range(alto) if any(tinta[y])]
    cols = [x for x in range(ancho) if any(tinta[y][x] for y in range(alto))]
    if not filas or not cols:
        return []
    return [fila[cols[0] : cols[-1] + 1] for fila in tinta[filas[0] : filas[-1] + 1]]


def _trozos(tinta: list[list[bool]]) -> list[list[list[bool]]]:
    if not tinta:
        return []
    alto, ancho = len(tinta), len(tinta[0])
    columnas = [any(tinta[y][x] for y in range(alto)) for x in range(ancho)]
    partes = []
    inicio = None
    for i, activa in enumerate(columnas + [False]):
        if activa and inicio is None:
            inicio = i
        elif not activa and inicio is not None:
            bloque = [fila[inicio:i] for fila in tinta]
            recorte = _recortar(bloque)
            if recorte:
                partes.append(recorte)
            inicio = None
    return partes


def _pelar_punto(bloque: list[list[bool]]) -> list[list[list[bool]]]:
    """Separa un punto decimal pegado bajo la barra alta de un 7."""
    alto, ancho = len(bloque), len(bloque[0])
    if ancho < 10 or alto < 8:
        return [bloque]
    for corte in range(ancho - 2, max(ancho - 5, 4), -1):
        columnas = range(corte, ancho)
        filas = [y for y in range(alto) if any(bloque[y][x] for x in columnas)]
        if not filas:
            continue
        if min(filas) < alto - 4:
            continue
        izquierda = _recortar([fila[:corte] for fila in bloque])
        punto = _recortar([fila[corte:] for fila in bloque])
        if izquierda and punto and len(punto) <= 4 and len(punto[0]) <= 4:
            return [izquierda, punto]
    return [bloque]


def _partir_pegados(bloque: list[list[bool]], profundidad: int = 0) -> list[list[list[bool]]]:
    """Separa dígitos que se tocan, cortando por la columna más vacía."""
    alto, ancho = len(bloque), len(bloque[0])
    if profundidad > 5 or alto <= 3 or ancho < 13:
        return [bloque]
    sumas = [sum(fila[x] for fila in bloque) for x in range(ancho)]
    zona = range(ancho // 3, ancho - ancho // 3)
    corte = min(zona, key=lambda x: (sumas[x], abs(x - ancho // 2)))
    if sumas[corte] > 3:
        return [bloque]
    izquierda = _recortar([fila[:corte] for fila in bloque])
    derecha = _recortar([fila[corte + 1 :] for fila in bloque])
    if not izquierda or not derecha:
        return [bloque]
    return _partir_pegados(izquierda, profundidad + 1) + _partir_pegados(derecha, profundidad + 1)


def _redimensionar(bloque: list[list[bool]], ancho: int = 8, alto: int = 12) -> list[list[bool]]:
    origen_h, origen_w = len(bloque), len(bloque[0])
    salida = []
    for gy in range(alto):
        fila = []
        y0 = gy * origen_h // alto
        y1 = max(y0 + 1, (gy + 1) * origen_h // alto)
        for gx in range(ancho):
            x0 = gx * origen_w // ancho
            x1 = max(x0 + 1, (gx + 1) * origen_w // ancho)
            fila.append(
                any(
                    bloque[y][x]
                    for y in range(y0, min(y1, origen_h))
                    for x in range(x0, min(x1, origen_w))
                )
            )
        salida.append(fila)
    return salida


def _distancia(a: list[list[bool]], b: list[list[bool]]) -> int:
    return sum(p != q for fila_a, fila_b in zip(a, b) for p, q in zip(fila_a, fila_b))


def _clasificar(bloque: list[list[bool]]) -> str:
    alto, ancho = len(bloque), len(bloque[0])
    if alto <= 3 and ancho <= 3:
        return "."
    if alto <= 3:
        return "-" if ancho < 14 else "----"
    muestra = _redimensionar(bloque)
    mejor_digito = "?"
    mejor_distancia = 10**9
    for digito, plantilla in _TEMPLATES:
        distancia = _distancia(muestra, _redimensionar(plantilla))
        if distancia < mejor_distancia:
            mejor_distancia = distancia
            mejor_digito = digito
    if mejor_distancia > 28:
        return "?"
    return mejor_digito


def leer_numero(raw: bytes) -> str | None:
    tinta = _recortar(_tinta(raw))
    if not tinta:
        return None
    piezas: list[list[list[bool]]] = []
    for trozo in _trozos(tinta):
        for parte in _partir_pegados(trozo):
            piezas.extend(_pelar_punto(parte))
    if piezas and all(len(pieza) <= 3 for pieza in piezas):
        return "----"
    texto = "".join(_clasificar(pieza) for pieza in piezas)
    return texto or None


def leer_estado(raw: bytes) -> tuple[str, str]:
    """
    Centro se puede trabajar (ok). Inferior y Superior son alerta (danger).
    Inferior empieza con una I muy angosta. Superior empieza con S, cerrada
    a la derecha. Centro empieza con C, abierta a la derecha.
    """
    tinta = _recortar(_tinta(raw))
    trozos = _trozos(tinta)
    if not trozos:
        return "Desconocido", "danger"
    primero = trozos[0]
    alto, ancho = len(primero), len(primero[0])
    if ancho <= 3:
        return "Inferior", "danger"
    # La C de Centro tiene el trazo izquierdo continuo en la mitad de abajo.
    # La S de Superior abre esa zona por la izquierda.
    mitad = alto // 2
    izquierda_abajo = sum(primero[y][0] or primero[y][1] for y in range(mitad, alto - 1))
    if izquierda_abajo >= 4:
        return "Centro", "ok"
    return "Superior", "danger"


def piezas_de(raw: bytes) -> Iterable[str]:
    """Utilidad de depuración: símbolos reconocidos en una celda."""
    tinta = _recortar(_tinta(raw))
    for trozo in _trozos(tinta):
        for pieza in _partir_pegados(trozo):
            yield _clasificar(pieza)
