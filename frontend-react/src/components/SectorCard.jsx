function valor(texto) {
  if (!texto || texto === '----') return '—';
  return texto;
}

function Fila({ titulo, frec, magMin, magMax, zMin, zMax }) {
  return (
    <tr>
      <th scope="row">{titulo}</th>
      <td>{valor(frec)}</td>
      <td>{valor(magMin)}</td>
      <td>{valor(magMax)}</td>
      <td>{valor(zMin)}</td>
      <td>{valor(zMax)}</td>
    </tr>
  );
}

export function SectorCard({ sector }) {
  const isOk = sector.estado === 'ok';
  const estadoClass = isOk ? 'ok' : 'danger';

  return (
    <article className={`sector-card ${estadoClass} ${sector.principal ? 'principal' : ''}`}>
      <header className="sc-header">
        <div>
          <h3 className="sc-name">{sector.nombre}</h3>
          {sector.principal && <p className="sc-principal">Polígono principal</p>}
        </div>
        <div className="sc-estado-wrap">
          <span className={`sc-estado ${estadoClass}`}>{sector.estado_label}</span>
          <p className="sc-aviso">{isOk ? 'Se puede trabajar' : 'Avisar a personal'}</p>
        </div>
      </header>

      <table className="sc-tabla">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Frec</th>
            <th scope="col">Mag mín</th>
            <th scope="col">Mag máx</th>
            <th scope="col">Z mín</th>
            <th scope="col">Z máx</th>
          </tr>
        </thead>
        <tbody>
          <Fila
            titulo="24 h"
            frec={sector.frec_24h}
            magMin={sector.mag_min_24h}
            magMax={sector.mag_max_24h}
            zMin={sector.z_min_24h}
            zMax={sector.z_max_24h}
          />
          <Fila
            titulo="7 días"
            frec={sector.frec_7d}
            magMin={sector.mag_min_7d}
            magMax={sector.mag_max_7d}
            zMin={sector.z_min_7d}
            zMax={sector.z_max_7d}
          />
        </tbody>
      </table>
    </article>
  );
}
