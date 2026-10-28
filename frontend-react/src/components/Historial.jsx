import { useState, useEffect } from 'react';
import { API_BASE } from '../api';
import { esVisible } from '../visibles';

function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export function Historial() {
  const [datos, setDatos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [filtroSector, setFiltroSector] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistorial = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          page_size: pageSize,
        });
        if (filtroSector) params.append('sector', filtroSector);
        if (filtroEstado) params.append('estado', filtroEstado);

        const res = await fetch(`${API_BASE}/api/sectores/historial?${params}`);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const data = await res.json();

        const filas = (data.datos || []).filter((fila) => esVisible(fila.nombre));
        setDatos(filas);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchHistorial();
    }, 400);

    return () => clearTimeout(timer);
  }, [page, pageSize, filtroSector, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const desde = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h1>Historial</h1>
          <p>Lecturas guardadas por el sistema para cada polígono.</p>
        </div>
      </div>

      <div className="filtros">
        <input
          type="search"
          placeholder="Buscar por polígono (ej: Esmeralda)"
          aria-label="Buscar por polígono"
          value={filtroSector}
          onChange={(e) => {
            setFiltroSector(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filtrar por estado"
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="ok">Centro</option>
          <option value="danger">Alerta</option>
        </select>
        {(filtroSector || filtroEstado) && (
          <button type="button" className="btn-texto" onClick={() => { setFiltroSector(''); setFiltroEstado(''); setPage(1); }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="tabla-wrap">
        <table className="tabla-tecnica">
          <thead>
            <tr>
              <th>Polígono</th>
              <th>Estado</th>
              <th>Frec. 24 h</th>
              <th>Mag. mín. 24 h</th>
              <th>Mag. máx. 24 h</th>
              <th>Frec. 7 días</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="tabla-mensaje">Cargando...</td></tr>
            ) : error ? (
              <tr><td colSpan="7" className="tabla-mensaje rojo">Error: {error}</td></tr>
            ) : datos.length === 0 ? (
              <tr>
                <td colSpan="7" className="tabla-mensaje">
                  <strong>No hay lecturas históricas guardadas</strong>
                  <span>El historial aparece cuando la mina envía mediciones.</span>
                </td>
              </tr>
            ) : (
              datos.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.nombre}</th>
                  <td><span className={`badge ${row.estado}`}>{row.estado_label}</span></td>
                  <td>{row.frec_24h || '—'}</td>
                  <td>{row.mag_min_24h || '—'}</td>
                  <td>{row.mag_max_24h || '—'}</td>
                  <td>{row.frec_7d || '—'}</td>
                  <td>{formatDatetime(row.timestamp_scraping)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="tabla-pie">
          <span>Mostrando {desde}–{hasta} de {total} registros</span>
          <div>
            <button type="button" className="btn-secundario" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </button>
            <span>{page} / {totalPages}</span>
            <button type="button" className="btn-secundario" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
