import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

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
        
        setDatos(data.datos);
        setTotal(data.total);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Debounce simple para la búsqueda
    const timer = setTimeout(() => {
      fetchHistorial();
    }, 400);

    return () => clearTimeout(timer);
  }, [page, pageSize, filtroSector, filtroEstado]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div id="tab-historial" className="tab-panel active">
      <div className="sector-header">
        <h2>Historial de Mediciones</h2>
      </div>
      
      <div className="historial-controls">
        <input 
          type="text" 
          placeholder="Buscar por sector (ej: Esmeralda)..." 
          value={filtroSector}
          onChange={(e) => {
            setFiltroSector(e.target.value);
            setPage(1);
          }}
        />
        <select 
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          <option value="ok">Estado OK</option>
          <option value="danger">Estado Peligro</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Polígono</th>
              <th>Estado</th>
              <th>Frec 24h</th>
              <th>-Mag 24h</th>
              <th>+Mag 24h</th>
              <th>Frec 7d</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Cargando...</td></tr>
            ) : error ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#ff7675' }}>Error: {error}</td></tr>
            ) : datos.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Sin registros encontrados</td></tr>
            ) : (
              datos.map((row) => (
                <tr key={row.id}>
                  <td className="nombre-col">{row.nombre}</td>
                  <td>
                    <span className={`estado-chip ${row.estado}`}>
                      {row.estado_label}
                    </span>
                  </td>
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
      </div>

      <div className="pagination">
        <button 
          className="page-btn" 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page <= 1}
        >
          ← Anterior
        </button>
        <span className="page-btn current">Pág. {page} / {totalPages}</span>
        <button 
          className="page-btn" 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
          disabled={page >= totalPages}
        >
          Siguiente →
        </button>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
          {total} registros totales
        </span>
      </div>
    </div>
  );
}
