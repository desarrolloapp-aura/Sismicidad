function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function Resumen({ reporte, error }) {
  const sectores = reporte?.sectores || [];
  const alertas = sectores.filter((s) => s.estado === 'danger');
  const lectura = formatDatetime(reporte?.timestamp_geovita);
  const mayor = [...sectores].sort((a, b) => (Number.parseFloat(b.frec_24h) || 0) - (Number.parseFloat(a.frec_24h) || 0))[0];

  let situacion = 'Todavía no hay una lectura para evaluar el estado.';
  if (error && !reporte) situacion = 'No hay lectura disponible. La consulta falló.';
  else if (reporte?.fuente === 'copia_local') situacion = 'Se muestra la copia guardada de la tabla. No es una conexión en vivo con la mina.';
  else if (alertas.length > 0) situacion = `${alertas.length} polígono${alertas.length === 1 ? '' : 's'} fuera de Centro. Hay que avisar a personal.`;
  else if (sectores.length > 0) situacion = 'En esta lectura, los polígonos informados están en Centro.';

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h2>Resumen general</h2>
          <p>El Teniente. {situacion}</p>
        </div>
      </div>

      <div className="kpis">
        <article>
          <span>Polígonos</span>
          <strong>{reporte ? sectores.length : '—'}</strong>
        </article>
        <article>
          <span>En Centro</span>
          <strong className="ok-val">{reporte ? reporte.total_ok : '—'}</strong>
        </article>
        <article>
          <span>Alertas</span>
          <strong className={reporte && reporte.total_danger > 0 ? 'danger-val' : ''}>{reporte ? reporte.total_danger : '—'}</strong>
          <small>Fuera de Centro en esta lectura</small>
        </article>
        <article>
          <span>Lectura de la tabla</span>
          <strong className="update-val">{lectura}</strong>
        </article>
      </div>

      <div className="panel-situacion">
        <h3>Situación</h3>
        <p>{situacion}</p>
        {mayor && Number.parseFloat(mayor.frec_24h) > 0 && (
          <p className="detalle">Mayor frecuencia en 24 h: {mayor.nombre}, {mayor.frec_24h}.</p>
        )}
      </div>
    </section>
  );
}
