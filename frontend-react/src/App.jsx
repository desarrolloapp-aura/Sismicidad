import { useState } from 'react';
import { Sismicidad } from './components/Sismicidad';
import { Admin } from './components/Admin';
import { useSectores } from './hooks/useSectores';

const MODULOS = [
  { id: 'sismicidad', nombre: 'Monitoreo sísmico' },
  { id: 'admin', nombre: 'Administración' },
];

function App() {
  const [modulo, setModulo] = useState('sismicidad');
  const { reporte, loading, error, secondsLeft } = useSectores();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="header-logo" src="/favicon.png" alt="" />
          <strong>Aura</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Secciones">
          {MODULOS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`menu-btn ${modulo === item.id ? 'active' : ''}`}
              onClick={() => setModulo(item.id)}
            >
              {item.nombre}
            </button>
          ))}
        </nav>
      </aside>
      <div className="shell-main">
        {modulo === 'admin' ? (
          <Admin />
        ) : (
          <Sismicidad
            reporte={reporte}
            loading={loading}
            error={error}
            secondsLeft={secondsLeft}
          />
        )}
      </div>
    </div>
  );
}

export default App;
