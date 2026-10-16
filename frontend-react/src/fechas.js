export function fechaCorta(isoStr) {
  if (!isoStr) return '—';
  const fecha = new Date(isoStr);
  if (Number.isNaN(fecha.getTime())) return '—';
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}
