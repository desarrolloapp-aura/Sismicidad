import { Tendencia } from './Tendencia';
import { Icono, TRAZOS } from './Icono';
import { fechaCorta } from '../fechas';

function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function frecuencia(sector) {
  const valor = Number.parseFloat(String(sector.frec_24h ?? '').replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

function mostrar(texto) {
  if (texto == null || texto === '' || texto === '----') return '—';
  return texto;
}

const ESTADOS = [
  { etiqueta: 'Centro', barra: 'verde' },
  { etiqueta: 'Inferior', barra: 'ambar' },
  { etiqueta: 'Superior', barra: 'rojo' },
];

export function Resumen({ reporte, error, onAbrir }) {
  const sectores = reporte?.sectores || [];
  const alertas = sectores.filter((s) => s.estado === 'danger');
  const lectura = formatDatetime(reporte?.timestamp_geovita);
  const mayor = [...sectores].sort((a, b) => (frecuencia(b) ?? -1) - (frecuencia(a) ?? -1))[0];
  const ordenados = [...sectores].sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === 'danger' ? -1 : 1;
    return (frecuencia(b) ?? -1) - (frecuencia(a) ?? -1);
  });
  const base = Math.max(sectores.length, 1);
  const conteos = ESTADOS.map((item) => ({
    ...item,
    valor: sectores.filter((s) => (s.estado_label || '').toLowerCase().startsWith(item.etiqueta.toLowerCase())).length,
  }));

  let situacion = 'Todavía no hay una lectura para evaluar el estado.';
  if (error && !reporte) situacion = 'No hay lectura disponible. La consulta falló.';
  else if (reporte?.fuente === 'respaldo') situacion = `Sin conexión con la mina. Se muestran los últimos datos que envió el PC de la mina (${formatDatetime(reporte.timestamp_consulta)}). No es la situación actual.`;
  else if (reporte?.fuente === 'copia_local') situacion = 'Se muestra la copia guardada de la tabla. No es una conexión en vivo con la mina.';
  else if (alertas.length > 0) situacion = `${alertas.length} polígono${alertas.length === 1 ? '' : 's'} fuera de Centro. Hay que avisar a personal.`;
  else if (sectores.length > 0) situacion = 'En esta lectura, los polígonos informados están en Centro.';

  const kpis = [
    { etiqueta: 'Polígonos', valor: reporte ? sectores.length : '—', icono: TRAZOS.hexagono },
    { etiqueta: 'En Centro', valor: reporte ? reporte.total_ok : '—', icono: TRAZOS.ok },
    { etiqueta: 'Alertas', valor: reporte ? reporte.total_danger : '—', icono: TRAZOS.alerta, clase: reporte?.total_danger > 0 ? 'rojo' : '' },
    { etiqueta: 'Mayor frec. 24 h', valor: mayor && frecuencia(mayor) != null ? mostrar(mayor.frec_24h) : '—', icono: TRAZOS.frecuencia },
    { etiqueta: 'Última lectura', valor: fechaCorta(reporte?.timestamp_geovita), icono: TRAZOS.reloj, titulo: lectura, clase: 'fecha' },
  ];

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h1>Resumen general</h1>
          <p>Centro de control de la sismicidad de los polígonos de El Teniente.</p>
        </div>
        <button type="button" className="btn-primario" onClick={() => onAbrir('poligonos')}>
          Ver monitoreo
        </button>
      </div>

      <div className="kpis">
        {kpis.map((item) => (
          <article key={item.etiqueta}>
            <div className="kpi-cabeza">
              <span>{item.etiqueta}</span>
              <Icono size={16} className="kpi-icono">{item.icono}</Icono>
            </div>
            <strong className={item.clase} title={item.titulo}>{item.valor}</strong>
          </article>
        ))}
      </div>

      <div className="resumen-grid">
        <section className="tarjeta resumen-lista">
          <header className="tarjeta-head">
            <h2>Estado por polígono</h2>
          </header>
          <ul className="lista-filas">
            {ordenados.length === 0 && <li className="lista-vacia">Todavía no hay polígonos en la lectura.</li>}
            {ordenados.map((sector) => (
              <li key={sector.nombre}>
                <span className={`fila-icono ${sector.estado}`}>
                  <Icono size={14} className="">{sector.estado === 'danger' ? TRAZOS.alerta : TRAZOS.ok}</Icono>
                </span>
                <div className="fila-texto">
                  <p>{sector.nombre}</p>
                  <small>
                    {sector.estado_label} · Frec. 24 h: {mostrar(sector.frec_24h)} · 7 días: {mostrar(sector.frec_7d)}
                  </small>
                </div>
                <span className="fila-dato">Mag. máx. {mostrar(sector.mag_max_24h)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="resumen-lado">
          <section className="tarjeta tarjeta-cuerpo">
            <h2>Estado de la lectura</h2>
            <ul className="barras">
              {conteos.map((item) => (
                <li key={item.etiqueta}>
                  <div className="barra-texto">
                    <span>{item.etiqueta}</span>
                    <span className={item.barra}>{item.valor} · {Math.round((item.valor / base) * 100)}%</span>
                  </div>
                  <div className="barra-pista">
                    <div className={`barra-relleno ${item.barra}`} style={{ width: `${(item.valor / base) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`tarjeta-aviso ${reporte?.fuente === 'respaldo' ? 'ambar' : alertas.length > 0 ? 'rojo' : ''}`}>
            <h2>Situación</h2>
            <p>{situacion}</p>
            {alertas.length > 0 && (
              <ul>
                {alertas.slice(0, 5).map((sector) => (
                  <li key={sector.nombre}>
                    <span className="badge danger">{sector.estado_label}</span>
                    <span>{sector.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Tendencia
        poligonos={sectores.map((s) => s.nombre)}
        inicial={(sectores.find((s) => s.principal) || sectores[0])?.nombre}
      />
    </section>
  );
}
