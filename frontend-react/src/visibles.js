export function esVisible(nombre) {
  return !/^AN\s/i.test(String(nombre || '').trim());
}
