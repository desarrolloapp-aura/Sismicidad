function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function SummaryStats({ reporte }) {
  if (!reporte) {
    return (
      <div className="summary-bar">
        <div className="summary-card"><div className="summary-info"><label>Cargando</label></div></div>
      </div>
    );
  }

  return (
    <div className="summary-bar">
      <div className="summary-card">
        <div className="summary-info">
          <label>Polígonos</label>
          <strong>{reporte.sectores?.length || 0}</strong>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-info">
          <label>Centro</label>
          <strong className="ok-val">{reporte.total_ok}</strong>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-info">
          <label>Alerta</label>
          <strong className="danger-val">{reporte.total_danger}</strong>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-info">
          <label>Actualización</label>
          <strong className="update-val">{formatDatetime(reporte.timestamp_geovita)}</strong>
        </div>
      </div>
    </div>
  );
}
