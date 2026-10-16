import React, { useState } from 'react';
import { Header } from './components/Header';
import { SummaryStats } from './components/SummaryStats';
import { Dashboard } from './components/Dashboard';
import { Historial } from './components/Historial';
import { Graficos } from './components/Graficos';
import { useSectores } from './hooks/useSectores';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { reporte, loading, error, secondsLeft } = useSectores();

  const alertas = (reporte?.sectores || []).filter((s) => s.estado === 'danger');

  return (
    <div className="app-wrapper">
      <Header secondsLeft={secondsLeft} />
      
      {error && (
        <div className="error-state" style={{ padding: '20px' }}>
          <h3>No se pudo conectar con la API</h3>
          <p>{error}</p>
        </div>
      )}

      {!error && <SummaryStats reporte={reporte} />}

      {alertas.length > 0 && (
        <div className="alerta-banner">
          <strong>Alerta sísmica.</strong> Hay que avisar a personal:{' '}
          {alertas.map((s) => `${s.nombre} (${s.estado_label})`).join(' · ')}
        </div>
      )}

      <nav className="tabs-bar">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Estado
        </button>
        <button 
          className={`tab-btn ${activeTab === 'graficos' ? 'active' : ''}`}
          onClick={() => setActiveTab('graficos')}
        >
          Frecuencia
        </button>
        <button 
          className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
        >
          Historial
        </button>
      </nav>

      <main className="main-content">
        {loading && !reporte ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Leyendo el sistema sísmico...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard sectores={reporte?.sectores || []} />}
            {activeTab === 'graficos' && <Graficos secondsLeft={secondsLeft} />}
            {activeTab === 'historial' && <Historial />}
          </>
        )}
      </main>

    </div>
  );
}

export default App;
