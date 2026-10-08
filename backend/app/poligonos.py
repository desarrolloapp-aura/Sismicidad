"""Polígonos que Aura debe vigilar, en el orden en que se muestran."""

POLIGONOS = [
    {
        "nombre": "Bajo Diamante Esmeralda",
        "grupo": "Esta etapa",
        "principal": True,
    },
    {
        "nombre": "Esmeralda Panel 1",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Bloque 1",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Extension Norte Bloque 2",
        "grupo": "Esta etapa",
        "principal": False,
    },
    {
        "nombre": "Esmeralda Extension Fw Bloque 2",
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
