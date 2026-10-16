import { useState } from 'react';

const GRAFICOS = [
  ['Esmeralda Bloque 1', 'grafico_esmbloque1.png'],
  ['Esmeralda Bloque 2 sobre UCL', 'grafico_esmbloque2_sobre_ucl.png'],
  ['Esmeralda Bloque 2 Bajo UCL (al Norte XC48)', 'grafico_esmbloque2_bajo_ucl.png'],
  ['Esmeralda Bloque 2 Bajo UCL (al Sur XC48)', 'grafico_esmbloque2_bajo_ucl_sur.png'],
  ['Bloque 2 Extensión Fw Norte', 'grafico_esmextensionfwnorte.png'],
  ['Bloque 2 Extensión Fw Sur', 'grafico_esmextensionfwsur.png'],
  ['Esmeralda Bloque 6', 'grafico_esmbloque6.png'],
  ['Esmeralda Sur', 'grafico_esmsur.png'],
];

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
  const [grafico, setGrafico] = useState(GRAFICOS[0][1]);
  const [graficoRoto, setGraficoRoto] = useState(false);
  const nombreGrafico = GRAFICOS.find((item) => item[1] === grafico)?.[0];

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

      <div className="grafico-reporte">
        <div className="modulo-head">
          <div>
            <h3>Tendencia</h3>
            <p>Gráfico publicado en el reporte sísmico para {nombreGrafico}. No se calcula con la tabla de arriba.</p>
          </div>
          <select
            aria-label="Polígono del gráfico"
            value={grafico}
            onChange={(event) => {
              setGrafico(event.target.value);
              setGraficoRoto(false);
            }}
          >
            {GRAFICOS.map(([nombre, archivo]) => (
              <option key={archivo} value={archivo}>{nombre}</option>
            ))}
          </select>
        </div>
        {graficoRoto ? (
          <p className="vacio">No se pudo cargar el gráfico de {nombreGrafico}.</p>
        ) : (
          <img
            src={`https://sismico-geovita.com/temp/${grafico}`}
            alt={`Tendencia de ${nombreGrafico}`}
            onError={() => setGraficoRoto(true)}
          />
        )}
      </div>
    </section>
  );
}
