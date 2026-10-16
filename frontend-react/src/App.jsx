import { useState } from 'react';
import { Resumen } from './components/Resumen';
import { Monitoreo } from './components/Monitoreo';
import { Graficos } from './components/Graficos';
import { Historial } from './components/Historial';
import { Admin } from './components/Admin';
import { useSectores } from './hooks/useSectores';

const GRUPOS = [
  {
    titulo: 'Monitoreo',
    items: [
      { id: 'resumen', nombre: 'Resumen general' },
      { id: 'poligonos', nombre: 'Monitoreo sísmico' },
      { id: 'frecuencia', nombre: 'Frecuencia sísmica' },
      { id: 'historial', nombre: 'Historial' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [{ id: 'admin', nombre: 'Administración' }],
  },
];

function formatDatetime(isoStr) {
  if (!isoStr) return '—';
  const fecha = new Date(isoStr);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function estadoConexion({ loading, refreshing, error, reporte }) {
  if (loading && !reporte) return { clase: 'actualizando', texto: 'Consultando' };
  if (refreshing) return { clase: 'actualizando', texto: 'Actualizando' };
  if (error && !reporte) return { clase: 'error', texto: 'Error de conexión' };
  if (error && reporte) return { clase: 'atrasado', texto: 'Datos desactualizados' };
  if (reporte?.fuente === 'en_vivo') return { clase: 'conectado', texto: 'Conectado' };
  if (reporte?.fuente === 'copia_local') return { clase: 'copia', texto: 'Copia guardada' };
  return { clase: 'atrasado', texto: 'Sin lectura' };
}

function App() {
  const [modulo, setModulo] = useState('resumen');
  const [contraido, setContraido] = useState(false);
  const { reporte, loading, refreshing, error, secondsLeft } = useSectores();
  const conexion = estadoConexion({ loading, refreshing, error, reporte });
  const titulo = GRUPOS.flatMap((grupo) => grupo.items).find((item) => item.id === modulo)?.nombre;
  const lectura = formatDatetime(reporte?.timestamp_geovita);

  return (
    <div className={`shell ${contraido ? 'contraido' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="header-logo" src="/favicon.png" alt="Aura" />
          {!contraido && <strong>Aura</strong>}
        </div>
        <nav className="sidebar-nav" aria-label="Secciones">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="menu-grupo">
              {!contraido && <p>{grupo.titulo}</p>}
              {grupo.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.nombre}
                  className={`menu-btn ${modulo === item.id ? 'active' : ''}`}
                  onClick={() => setModulo(item.id)}
                >
                  {contraido ? item.nombre.slice(0, 1) : item.nombre}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button type="button" className="menu-colapsar" onClick={() => setContraido((valor) => !valor)}>
          {contraido ? 'Expandir menú' : 'Contraer menú'}
        </button>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <p className="header-kicker">El Teniente</p>
            <h1>{titulo}</h1>
          </div>
          <div className="topbar-estado">
            <span className={`conexion ${conexion.clase}`}>{conexion.texto}</span>
            <span>Lectura de la tabla: {lectura}</span>
            <span>Próxima consulta en {secondsLeft}s</span>
          </div>
        </header>

        <main className="main-content">
          {modulo === 'resumen' && <Resumen reporte={reporte} error={error} />}
          {modulo === 'poligonos' && (
            <Monitoreo sectores={reporte?.sectores || []} actualizado={lectura} />
          )}
          {modulo === 'frecuencia' && <Graficos secondsLeft={secondsLeft} />}
          {modulo === 'historial' && <Historial />}
          {modulo === 'admin' && <Admin />}
        </main>
      </div>
    </div>
  );
}

export default App;
