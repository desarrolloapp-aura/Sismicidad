import { useEffect, useState } from 'react';
import { Resumen } from './components/Resumen';
import { Monitoreo } from './components/Monitoreo';
import { Graficos } from './components/Graficos';
import { Historial } from './components/Historial';
import { useSectores } from './hooks/useSectores';

function Icono({ children }) {
  return (
    <svg className="menu-icono" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONOS = {
  resumen: (
    <Icono>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icono>
  ),
  poligonos: (
    <Icono>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </Icono>
  ),
  frecuencia: (
    <Icono>
      <path d="M12 16v5" />
      <path d="M16 14v7" />
      <path d="M20 10v11" />
      <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" />
      <path d="M4 18v3" />
      <path d="M8 14v7" />
    </Icono>
  ),
  historial: (
    <Icono>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </Icono>
  ),
};

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
  const [movil, setMovil] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { reporte, loading, refreshing, error, secondsLeft } = useSectores();
  const conexion = estadoConexion({ loading, refreshing, error, reporte });
  const titulo = GRUPOS.flatMap((grupo) => grupo.items).find((item) => item.id === modulo)?.nombre;
  const lectura = formatDatetime(reporte?.timestamp_geovita);
  const textoVisible = movil || !contraido;

  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 800px)');
    const aplicar = () => {
      setMovil(consulta.matches);
      if (!consulta.matches) setMenuAbierto(false);
    };
    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, []);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrar = (evento) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [menuAbierto]);

  function abrirModulo(id) {
    setModulo(id);
    if (movil) setMenuAbierto(false);
  }

  return (
    <div className={`shell ${!movil && contraido ? 'contraido' : ''} ${movil && menuAbierto ? 'menu-abierto' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/favicon.png" alt="Aura" />
          {textoVisible && <strong>Aura</strong>}
          <button
            type="button"
            className="menu-movil"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((valor) => !valor)}
          >
            <Icono>
              {menuAbierto ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </Icono>
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Secciones">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo} className="menu-grupo">
              {textoVisible && <p>{grupo.titulo}</p>}
              {grupo.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={!textoVisible ? item.nombre : undefined}
                  aria-label={item.nombre}
                  aria-current={modulo === item.id ? 'page' : undefined}
                  className={`menu-btn ${modulo === item.id ? 'active' : ''}`}
                  onClick={() => abrirModulo(item.id)}
                >
                  {ICONOS[item.id]}
                  {textoVisible && <span>{item.nombre}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-pie">
          <button
            type="button"
            className="menu-colapsar"
            title={!textoVisible ? 'Expandir menú' : undefined}
            aria-label={textoVisible ? 'Contraer menú' : 'Expandir menú'}
            aria-expanded={textoVisible}
            onClick={() => setContraido((valor) => !valor)}
          >
            <Icono>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              {textoVisible ? <path d="m16 15-3-3 3-3" /> : <path d="m14 9 3 3-3 3" />}
            </Icono>
            {textoVisible && <span>Contraer menú</span>}
          </button>
        </div>
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
        </main>
      </div>
    </div>
  );
}

export default App;
