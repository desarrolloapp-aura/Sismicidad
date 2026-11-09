/** Nombre para pantalla (GeoVita). La API y las rutas siguen usando nombre Codelco. */
export function nombreVista(sectorONombre) {
  if (sectorONombre && typeof sectorONombre === 'object') {
    return sectorONombre.nombre_vista || sectorONombre.nombre || '';
  }
  return sectorONombre || '';
}
