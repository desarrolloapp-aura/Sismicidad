import { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../api';
import { fechaCorta } from '../fechas';
import { guardarSeleccionMuro, seleccionEfectiva } from '../lib/muroPoligonos';
import { nombreVista } from '../lib/nombreVista';
import { GraficoReal, preparar } from './Tendencia';
import { SelectorMuro } from './SelectorMuro';

const HORAS = 168;
const MINUTO = 60000;
const ESPERA = 60;

function hora(ms) {
  return new Date(ms).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function duracion(ms) {
  const total = Math.max(0, Math.floor(ms / MINUTO));
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const minutos = total % 60;
  if (dias > 0) return `${dias}d ${horas}h ${minutos}m`;
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
}

function permanencia(registros) {
  const puntos = (registros || [])
    .map((r) => ({ t: new Date(r.timestamp_scraping).getTime(), estado: r.estado_label }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
  if (puntos.length === 0) return { cambio: '—', tiempo: '—' };
  let indice = puntos.length - 1;
  const actual = puntos[indice].estado;
  while (indice > 0 && puntos[indice - 1].estado === actual) indice -= 1;
  const desde = puntos[indice].t;
  return { cambio: hora(desde), tiempo: duracion(puntos[puntos.length - 1].t - desde) };
}

function claseEstado(etiqueta) {
  return String(etiqueta || '').toLowerCase().startsWith('centro') ? 'centro' : 'alerta';
}

function etiquetaCorta(etiqueta) {
  const texto = String(etiqueta || '');
  if (/^superior/i.test(texto)) return 'Superior';
  if (/^inferior/i.test(texto)) return 'Inferior';
  return 'Centro';
}

function columnasPara(n, ancho) {
  let maxPorAncho = 6;
  if (ancho < 520) maxPorAncho = 1;
  else if (ancho < 720) maxPorAncho = 2;
  else if (ancho < 980) maxPorAncho = 3;
  else if (ancho < 1280) maxPorAncho = 4;
  else if (ancho < 1600) maxPorAncho = 5;

  let porCantidad = 1;
  if (n <= 1) porCantidad = 1;
  else if (n <= 2) porCantidad = 2;
  else if (n <= 4) porCantidad = 2;
  else if (n <= 6) porCantidad = 3;
  else if (n <= 8) porCantidad = 4;
  else if (n <= 12) porCantidad = 4;
  else if (n <= 16) porCantidad = 4;
  else if (n <= 20) porCantidad = 5;
  else porCantidad = 6;

  return Math.max(1, Math.min(porCantidad, maxPorAncho, Math.max(n, 1)));
}

function IconoOk() {
  return (
    <svg className="gv-ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.2" />
      <path d="M7 12.5 10.2 16 17 8.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoAlerta() {
  return (
    <svg className="gv-ico" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.2" />
      <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function IconoTelefonoPie() {
  /* Teléfono de mesa rosa (GeoVita), no celular. */
  return (
    <img
      className="gv-pie-ico-svg"
      src="/iconos/telefono.png"
      alt=""
      width={18}
      height={18}
      draggable={false}
    />
  );
}

function IconoRutaPie() {
  return (
    <img
      className="gv-pie-ico-svg"
      src="/iconos/ruta.png"
      alt=""
      width={18}
      height={18}
      draggable={false}
    />
  );
}

const CONTACTOS_PIE = [
  { id: 'incendio', etiqueta: 'Incendio', valor: '6000', icono: '🔥' },
  { id: 'det', etiqueta: 'Emergencia DET', valor: '2121', icono: '🚨' },
  { id: 'ruta', etiqueta: 'Emergencia Ruta', valor: '8000', Icono: IconoRutaPie },
  { id: 'comite', etiqueta: 'Emergencia Comité Divisional', valor: '4000', icono: '⚠️' },
  { id: 'sismo', etiqueta: 'Monitoreo Sísmico', valor: '6693', Icono: IconoTelefonoPie },
];

function Tarjeta({ sector, registros, onAbrirGrafico }) {
  const tipo = claseEstado(sector.estado_label);
  const puntos = registros ? preparar(registros) : null;
  const { cambio, tiempo } = permanencia(registros);
  const ok = tipo === 'centro';

  return (
    <article className={`gv-card ${tipo}`}>
      <div className="gv-card-head">{nombreVista(sector)}</div>
      <div className="gv-card-body">
        <div className="gv-card-fila">
          <div className="gv-card-info">
            <p>
              <em>Último cambio:</em>
              <b>{cambio}</b>
            </p>
            <p>
              <em>Tiempo en estado:</em>
              <b>{tiempo}</b>
            </p>
          </div>
          <div className="gv-status">
            {ok ? <IconoOk /> : <IconoAlerta />}
            <span>{etiquetaCorta(sector.estado_label)}</span>
          </div>
          <button
            type="button"
            className="gv-card-chart"
            onClick={() => onAbrirGrafico(sector)}
            title="Ver gráfico ampliado"
          >
            {!puntos && <span>Cargando…</span>}
            {puntos && puntos.length === 0 && <span>Sin lecturas</span>}
            {puntos && puntos.length > 0 && <GraficoReal puntos={puntos} alto="100%" compacto />}
          </button>
        </div>
      </div>
    </article>
  );
}

function TarjetaPrincipal({ sector, registros }) {
  const tipo = claseEstado(sector.estado_label);
  const { cambio, tiempo } = permanencia(registros);
  const ok = tipo === 'centro';

  return (
    <article className={`gv-hero ${tipo}`}>
      <div className="gv-hero-izq">
        <h2>{nombreVista(sector)}</h2>
        <div className="gv-status gv-status-lg">
          {ok ? <IconoOk /> : <IconoAlerta />}
          <span>{etiquetaCorta(sector.estado_label)}</span>
        </div>
      </div>
      <div className="gv-hero-der">
        <p><em>Último cambio:</em> <b>{cambio}</b></p>
        <p><em>Tiempo en estado:</em> <b>{tiempo}</b></p>
      </div>
    </article>
  );
}

function ModalGrafico({ sector, registros, onCerrar }) {
  const puntos = registros ? preparar(registros) : null;
  const capturado = new Date().toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  return (
    <div className="gv-modal-overlay visible" role="dialog" aria-modal="true" onClick={onCerrar}>
      <div className="gv-modal-panel" onClick={(e) => e.stopPropagation()}>
        <header className="gv-modal-header">
          <strong>{nombreVista(sector)}</strong>
          <button type="button" className="gv-modal-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <p className="gv-modal-captura">Gráfico · {capturado}</p>
        <div className="gv-modal-body">
          {!puntos && <p>Cargando…</p>}
          {puntos && puntos.length === 0 && <p>Sin lecturas para este polígono.</p>}
          {puntos && puntos.length > 0 && <GraficoReal puntos={puntos} alto={420} />}
        </div>
      </div>
    </div>
  );
}

export function Muro() {
  const [catalogo, setCatalogo] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [series, setSeries] = useState({});
  const [seleccion, setSeleccion] = useState([]);
  const [panel, setPanel] = useState(false);
  const [segundos, setSegundos] = useState(ESPERA);
  const [error, setError] = useState(false);
  const [modal, setModal] = useState(null);
  const [ancho, setAncho] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1400));

  useEffect(() => {
    const onResize = () => setAncho(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let vivo = true;
    let queda = ESPERA;

    const cargar = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
        if (!res.ok) throw new Error('estado');
        const data = await res.json();
        const todos = data.sectores || [];
        const elegidos = seleccionEfectiva(todos);
        const sectores = todos.filter((s) => elegidos.includes(s.nombre));
        const pares = await Promise.all(sectores.map(async (sector) => {
          const respuesta = await fetch(`${API_BASE}/api/sectores/${encodeURIComponent(sector.nombre)}/tendencia?horas=${HORAS}`);
          const lista = respuesta.ok ? await respuesta.json() : [];
          return [sector.nombre, Array.isArray(lista) ? lista : []];
        }));
        if (!vivo) return;
        setCatalogo(todos);
        setSeleccion(elegidos);
        setReporte({ ...data, sectores });
        setSeries(Object.fromEntries(pares));
        setError(false);
      } catch {
        if (vivo) setError(true);
      }
    };

    cargar();
    const reloj = setInterval(() => {
      queda -= 1;
      if (queda <= 0) {
        queda = ESPERA;
        cargar();
      }
      if (vivo) setSegundos(queda);
    }, 1000);

    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, []);

  function aplicarSeleccion(nombres) {
    const limpios = guardarSeleccionMuro(nombres);
    setSeleccion(limpios);
    const sectores = catalogo.filter((s) => limpios.includes(s.nombre));
    setReporte((prev) => (prev ? { ...prev, sectores } : prev));
    (async () => {
      const pares = await Promise.all(sectores.map(async (sector) => {
        if (series[sector.nombre]) return [sector.nombre, series[sector.nombre]];
        const respuesta = await fetch(`${API_BASE}/api/sectores/${encodeURIComponent(sector.nombre)}/tendencia?horas=${HORAS}`);
        const lista = respuesta.ok ? await respuesta.json() : [];
        return [sector.nombre, Array.isArray(lista) ? lista : []];
      }));
      setSeries((prev) => ({ ...prev, ...Object.fromEntries(pares) }));
    })();
  }

  const sectores = useMemo(
    () => [...(reporte?.sectores || [])].sort((a, b) => Number(b.principal) - Number(a.principal)),
    [reporte],
  );
  const principal = sectores.find((s) => s.principal);
  const resto = principal ? sectores.filter((s) => s.nombre !== principal.nombre) : sectores;
  const cols = columnasPara(resto.length || 1, ancho);
  const rows = Math.max(1, Math.ceil(Math.max(resto.length, 1) / cols));

  return (
    <div className={`muro gv${panel ? ' con-panel' : ''}`}>
      <header className="gv-top">
        <button type="button" className="gv-brand" onClick={() => setPanel((v) => !v)} title="Elegir polígonos de este equipo">
          <img src="/favicon.png" alt="" />
          <div>
            <strong>Monitoreo Sísmico El Teniente</strong>
            <span>Aura Ingeniería · Planificación y Control</span>
            <em>Última actualización: {reporte ? fechaCorta(reporte.timestamp_geovita) : '—'}</em>
          </div>
        </button>

        {principal ? (
          <TarjetaPrincipal sector={principal} registros={series[principal.nombre]} />
        ) : (
          <div className="gv-hero gv-hero-vacio">Elegí un polígono principal</div>
        )}

        <div className="gv-next">
          <i aria-hidden="true" />
          Próxima actualización en {segundos}s
        </div>
      </header>

      {panel && (
        <aside className="gv-panel">
          <div className="gv-panel-head">
            <h3>Polígonos en este equipo</h3>
            <button type="button" onClick={() => setPanel(false)}>Cerrar</button>
          </div>
          <p>Solo este monitor. Tocá la tarjeta Aura para abrir o cerrar.</p>
          <SelectorMuro catalogo={catalogo} seleccion={seleccion} onChange={aplicarSeleccion} />
        </aside>
      )}

      {error && !reporte && <p className="gv-aviso">No se pudo leer la mina.</p>}
      {!error && reporte && sectores.length === 0 && (
        <p className="gv-aviso">Sin polígonos. Tocá la tarjeta Aura (arriba izquierda) para elegir.</p>
      )}

      <div className="gv-grilla" style={{ '--cols': String(cols), '--rows': String(rows) }}>
        {resto.map((sector) => (
          <Tarjeta
            key={sector.nombre}
            sector={sector}
            registros={series[sector.nombre]}
            onAbrirGrafico={setModal}
          />
        ))}
      </div>

      <footer className="gv-pie">
        <div className="gv-pie-bar">
          {CONTACTOS_PIE.map((item, i) => (
            <span key={item.id} className="gv-pie-grupo">
              {i > 0 && <span className="gv-pie-sep" aria-hidden="true" />}
              <span className="gv-pie-item">
                {item.Icono ? <item.Icono /> : <span className="gv-pie-ico" aria-hidden="true">{item.icono}</span>}
                <span className="gv-pie-label">{item.etiqueta}:</span>
                <span className="gv-pie-num">{item.valor}</span>
              </span>
            </span>
          ))}
        </div>
      </footer>

      {modal && (
        <ModalGrafico
          sector={modal}
          registros={series[modal.nombre]}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
