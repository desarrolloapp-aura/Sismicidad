import { useState } from 'react';
import { Dashboard } from './Dashboard';

function numero(texto) {
  if (texto == null || texto === '' || texto === '----') return null;
  const valor = Number.parseFloat(String(texto).replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

function mostrar(texto) {
  if (!texto || texto === '----') return '—';
  return texto;
}

function valorOrden(sector, clave) {
  if (clave === 'nombre' || clave === 'estado_label') return sector[clave] || '';
  return numero(sector[clave]);
}

function comparar(a, b, orden) {
  const va = valorOrden(a, orden.clave);
  const vb = valorOrden(b, orden.clave);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * orden.dir;
  return String(va).localeCompare(String(vb), 'es') * orden.dir;
}

export function Monitoreo({ sectores, actualizado }) {
  const [vista, setVista] = useState('tabla');
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const [orden, setOrden] = useState({ clave: 'nombre', dir: 1 });

  const lista = sectores
    .filter((sector) => {
      const texto = busqueda.trim().toLowerCase();
      const coincide = !texto || sector.nombre.toLowerCase().includes(texto);
      const estadoOk = estado === 'todos' || sector.estado === estado;
      return coincide && estadoOk;
    })
    .sort((a, b) => comparar(a, b, orden));

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h2>Polígonos de trabajo</h2>
          <p>Frecuencia, magnitud y cota Z de la lectura disponible. Centro es el estado que informa la tabla.</p>
        </div>
        <div className="vista-switch" role="group" aria-label="Tipo de vista">
          <button type="button" className={vista === 'tabla' ? 'active' : ''} onClick={() => setVista('tabla')}>Tabla</button>
          <button type="button" className={vista === 'tarjetas' ? 'active' : ''} onClick={() => setVista('tarjetas')}>Tarjetas</button>
        </div>
      </div>

      <div className="filtros">
        <input
          type="search"
          value={busqueda}
          placeholder="Buscar polígono"
          aria-label="Buscar polígono"
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <select aria-label="Filtrar por estado" value={estado} onChange={(event) => setEstado(event.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="ok">Centro</option>
          <option value="danger">Alerta</option>
        </select>
        {(busqueda || estado !== 'todos') && (
          <button type="button" className="btn-texto" onClick={() => { setBusqueda(''); setEstado('todos'); }}>
            Limpiar
          </button>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="vacio">No hay polígonos con esos filtros.</p>
      ) : vista === 'tabla' ? (
        <Tabla sectores={lista} orden={orden} onOrden={setOrden} actualizado={actualizado} />
      ) : (
        <Dashboard sectores={lista} />
      )}
    </section>
  );
}

function Tabla({ sectores, orden, onOrden, actualizado }) {
  const columnas = [
    ['nombre', 'Polígono'],
    ['estado_label', 'Estado'],
    ['frec_24h', 'Frec. 24 h'],
    ['frec_7d', 'Frec. 7 días'],
    ['mag_min_24h', 'Mag. mín.'],
    ['mag_max_24h', 'Mag. máx.'],
    ['z_min_24h', 'Z mín.'],
    ['z_max_24h', 'Z máx.'],
  ];

  const pulsar = (clave) => {
    onOrden((previo) => ({ clave, dir: previo.clave === clave ? previo.dir * -1 : 1 }));
  };

  return (
    <div className="tabla-wrap">
      <table className="tabla-tecnica">
        <thead>
          <tr>
            {columnas.map(([clave, etiqueta]) => (
              <th key={clave} scope="col">
                <button type="button" onClick={() => pulsar(clave)}>
                  {etiqueta}{orden.clave === clave ? (orden.dir > 0 ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
            <th scope="col">Lectura de la tabla</th>
          </tr>
        </thead>
        <tbody>
          {sectores.map((sector) => (
            <tr key={sector.nombre}>
              <th scope="row">{sector.nombre}</th>
              <td><span className={`estado-chip ${sector.estado}`}>{sector.estado_label}</span></td>
              <td>{mostrar(sector.frec_24h)}</td>
              <td>{mostrar(sector.frec_7d)}</td>
              <td>{mostrar(sector.mag_min_24h)}</td>
              <td>{mostrar(sector.mag_max_24h)}</td>
              <td>{mostrar(sector.z_min_24h)}</td>
              <td>{mostrar(sector.z_max_24h)}</td>
              <td>{actualizado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
