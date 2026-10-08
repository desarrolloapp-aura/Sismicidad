import React, { useState } from 'react';
import { SectorCard } from './SectorCard';

const GRUPOS = ['Esta etapa', 'Etapa anterior'];

export function Dashboard({ sectores }) {
  const [filtroActual, setFiltroActual] = useState('all');

  const filtrados = filtroActual === 'all'
    ? sectores
    : sectores.filter((s) => s.estado === filtroActual);

  return (
    <div id="tab-dashboard" className="tab-panel active">
      <div className="sector-header">
        <h2>Polígonos de trabajo</h2>
        <div className="filter-bar">
          <button
            className={`filter-btn ${filtroActual === 'all' ? 'active all' : ''}`}
            onClick={() => setFiltroActual('all')}
          >
            Todos
          </button>
          <button
            className={`filter-btn ok ${filtroActual === 'ok' ? 'active' : ''}`}
            onClick={() => setFiltroActual('ok')}
          >
            Centro
          </button>
          <button
            className={`filter-btn danger ${filtroActual === 'danger' ? 'active' : ''}`}
            onClick={() => setFiltroActual('danger')}
          >
            Alerta
          </button>
        </div>
      </div>

      {GRUPOS.map((grupo) => {
        const delGrupo = filtrados.filter((s) => (s.grupo || 'Esta etapa') === grupo);
        if (delGrupo.length === 0) return null;
        return (
          <section key={grupo} className="grupo-sector">
            <h3>{grupo === 'Esta etapa' ? 'Esta etapa del contrato' : 'Etapa anterior'}</h3>
            <div className="sectores-grid">
              {delGrupo.map((sector) => (
                <SectorCard key={sector.nombre} sector={sector} />
              ))}
            </div>
          </section>
        );
      })}

      {filtrados.length === 0 && (
        <div className="loading-state">
          <p>No hay polígonos con el filtro seleccionado.</p>
        </div>
      )}
    </div>
  );
}
