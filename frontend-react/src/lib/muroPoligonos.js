/** Selección de polígonos del muro: solo en este dispositivo (localStorage). */

const CLAVE = 'aura.muro.poligonos';

export function leerSeleccionMuro() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const lista = JSON.parse(crudo);
    if (!Array.isArray(lista)) return null;
    return lista.map((n) => String(n)).filter(Boolean);
  } catch {
    return null;
  }
}

export function guardarSeleccionMuro(nombres) {
  const limpios = [...new Set((nombres || []).map((n) => String(n)).filter(Boolean))];
  localStorage.setItem(CLAVE, JSON.stringify(limpios));
  return limpios;
}

/** Si nunca se configuró, usa los de «Esta etapa» (no todo el resumen Codelco). */
export function seleccionEfectiva(catalogo) {
  const guardada = leerSeleccionMuro();
  const lista = catalogo || [];
  if (guardada === null) {
    return lista
      .filter((s) => (s.grupo || '') === 'Esta etapa')
      .map((s) => s.nombre)
      .filter(Boolean);
  }
  const set = new Set(lista.map((s) => s.nombre).filter(Boolean));
  return guardada.filter((n) => set.has(n));
}

export function estaEnMuro(nombre, seleccion) {
  return (seleccion || []).includes(nombre);
}
