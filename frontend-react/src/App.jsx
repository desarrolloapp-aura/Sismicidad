import { useCallback, useEffect, useState } from 'react';
import { Resumen } from './components/Resumen';
import { Monitoreo } from './components/Monitoreo';
import { Graficos } from './components/Graficos';
import { Historial } from './components/Historial';
import { Buscador } from './components/Buscador';
import { Icono, TRAZOS } from './components/Icono';
import { useSectores } from './hooks/useSectores';
import { fechaCorta } from './fechas';

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
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const { reporte, loading, refreshing, error, secondsLeft, fetchSectores } = useSectores();
  const conexion = estadoConexion({ loading, refreshing, error, reporte });
  const titulo = GRUPOS.flatMap((grupo) => grupo.items).find((item) => item.id === modulo)?.nombre;
  const lectura = formatDatetime(reporte?.timestamp_geovita);
  const textoVisible = movil || !contraido;
  const cerrarBuscador = useCallback(() => setBuscando(false), []);

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
    const teclas = (evento) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setBuscando(true);
      } else if (evento.key === 'Escape') {
        setMenuAbierto(false);
      }
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, []);

  function abrirModulo(id) {
    setModulo(id);
    if (movil) setMenuAbierto(false);
  }

  function elegirPoligono(nombre) {
    setBusqueda(nombre);
    setBuscando(false);
    abrirModulo('poligonos');
  }

  return (
    <div className={`shell ${!movil && contraido ? 'contraido' : ''} ${movil && menuAbierto ? 'menu-abierto' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src="/favicon.png" alt="Aura" />
          {textoVisible && (
            <div className="sidebar-marca">
              <strong>Aura Ingeniería</strong>
              <span>Monitoreo sísmico</span>
            </div>
          )}
          <button
            type="button"
            className="menu-movil"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((valor) => !valor)}
          >
            <Icono>{menuAbierto ? TRAZOS.cerrar : TRAZOS.menu}</Icono>
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
                  <Icono>{TRAZOS[item.id]}</Icono>
                  {textoVisible && <span>{item.nombre}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-pie">
          <div className="sidebar-usuario">
            <span className="avatar">ET</span>
            {textoVisible && (
              <div className="sidebar-usuario-texto">
                <strong>El Teniente</strong>
                <span>Lectura {fechaCorta(reporte?.timestamp_geovita)}</span>
              </div>
            )}
            <button
              type="button"
              className="menu-colapsar"
              title={textoVisible ? 'Contraer menú' : 'Expandir menú'}
              aria-label={textoVisible ? 'Contraer menú' : 'Expandir menú'}
              aria-expanded={textoVisible}
              onClick={() => setContraido((valor) => !valor)}
            >
              <Icono size={16}>{textoVisible ? TRAZOS.contraer : TRAZOS.expandir}</Icono>
            </button>
          </div>
          {textoVisible && <p className="sidebar-estado">Próxima consulta en {secondsLeft}s</p>}
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <p className="ruta">
            {modulo === 'resumen' ? 'Aura Ingeniería' : 'El Teniente'}
            <span>/</span>
            <strong>{modulo === 'resumen' ? 'El Teniente' : titulo}</strong>
          </p>
          <div className="topbar-acciones">
            <button type="button" className="topbar-buscar" onClick={() => setBuscando(true)}>
              <Icono size={14} className="">{TRAZOS.buscar}</Icono>
              <span>Buscar</span>
              <kbd>Ctrl+K</kbd>
            </button>
            <span className={`topbar-chip ${conexion.clase}`} title={`Lectura de la tabla: ${lectura}`}>
              <i aria-hidden="true" />
              {conexion.texto}
            </span>
            <button
              type="button"
              className="topbar-accion"
              disabled={refreshing}
              title={`Próxima consulta en ${secondsLeft}s`}
              onClick={fetchSectores}
            >
              <Icono size={14} className="">{TRAZOS.actualizar}</Icono>
              Actualizar
            </button>
          </div>
        </header>

        <main className="main-content">
          {modulo === 'resumen' && (
            <Resumen reporte={reporte} error={error} onAbrir={abrirModulo} />
          )}
          {modulo === 'poligonos' && (
            <Monitoreo
              sectores={reporte?.sectores || []}
              actualizado={fechaCorta(reporte?.timestamp_geovita)}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
            />
          )}
          {modulo === 'frecuencia' && <Graficos />}
          {modulo === 'historial' && <Historial />}
        </main>
      </div>

      {buscando && (
        <Buscador sectores={reporte?.sectores || []} onElegir={elegirPoligono} onCerrar={cerrarBuscador} />
      )}
    </div>
  );
}

export default App;
