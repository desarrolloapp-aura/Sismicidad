"""Polígonos que Aura debe vigilar, en el orden en que se muestran.

nombre: exactamente como aparece en la tabla Codelco (lectura).
nombre_vista: como se muestra en pantalla (GeoVita / sala). Si no va, se usa nombre.
"""

POLIGONOS = [
    {
        "nombre": "Bajo Diamante Esmeralda",
        "nombre_vista": "Bloque Bajo Diamante",
        "grupo": "Esta etapa",
        "principal": True,
    },
    {
        "nombre": "Esmeralda Bloque 1",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Bloque 2 sobre UCL",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Bloque 2 Bajo UCL (al Norte XC48)",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Bloque 2 Bajo UCL (al Sur XC48)",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Extension Norte Bloque 2",
        "nombre_vista": "Bloque 2 Extensión Fw Norte",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Extension Fw Bloque 2",
        "nombre_vista": "Bloque 2 Extensión Fw Sur",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Poligono Desarrollo Bloque6",
        "nombre_vista": "Esmeralda Bloque 6",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Sur",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Panel 1",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "AN Inicio Caving",
        "grupo": "Etapa anterior",
        "principal": False,
    },
    {
        "nombre": "AN Norte-Fw",
        "grupo": "Etapa anterior",
        "principal": False,
    },
    {
        "nombre": "AN Norte-Hw",
        "grupo": "Etapa anterior",
        "principal": False,
    },
    {
        "nombre": "AN Sur-Hw",
        "grupo": "Etapa anterior",
        "principal": False,
    },
    {
        "nombre": "Bajo Andes Norte",
        "grupo": "Etapa anterior",
        "principal": False,
    },
    {
        "nombre": "Monitoreo Post Evento 2025",
        "grupo": "Etapa anterior",
        "principal": False,
    },
]


def _norm(texto: str) -> str:
    tabla = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ-", "aeiouunAEIOUUN ")
    limpio = " ".join(texto.translate(tabla).lower().split())
    return limpio


_INDICE = {_norm(item["nombre"]): item for item in POLIGONOS}


def buscar_poligono(nombre_pagina: str):
    """Devuelve la ficha Aura si el nombre de la tabla Codelco corresponde."""
    clave = _norm(nombre_pagina)
    if clave in _INDICE:
        return _INDICE[clave]
    for conocido, ficha in _INDICE.items():
        if conocido in clave or clave in conocido:
            return ficha
    return None


def nombre_visible(ficha_o_nombre) -> str:
    if isinstance(ficha_o_nombre, dict):
        return ficha_o_nombre.get("nombre_vista") or ficha_o_nombre["nombre"]
    ficha = _INDICE.get(_norm(ficha_o_nombre))
    if ficha:
        return ficha.get("nombre_vista") or ficha["nombre"]
    return ficha_o_nombre
