import { useEffect, useState } from 'react';
import { API_BASE } from '../api';
import { esVisible } from '../visibles';
import { fechaCorta } from '../fechas';
import { GraficoReal, preparar } from './Tendencia';

const HORAS = 168;
const MINUTO = 60000;
const ESPERA = 60;

function hora(ms) {
  return new Date(ms).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function duracion(ms) {
  const total = Math.max(0, Math.floor(ms / MINUTO));
  const dias = Math.floor(total / 1440);
  const horas = Math.floor((total % 1440) / 60);
  const minutos = total % 60;
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${minutos} min`;
  return `${minutos} min`;
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
  const cambio = indice === 0 ? `desde ${hora(desde)}` : hora(desde);
  return { cambio, tiempo: duracion(puntos[puntos.length - 1].t - desde) };
}

function claseEstado(etiqueta) {
  const texto = String(etiqueta || '').toLowerCase();
  if (texto.startsWith('superior')) return 'superior';
  if (texto.startsWith('inferior')) return 'inferior';
  return 'centro';
}

function Tarjeta({ sector, registros }) {
  const tipo = claseEstado(sector.estado_label);
  const puntos = registros ? preparar(registros) : null;
  const { cambio, tiempo } = permanencia(registros);
  return (
    <article className={`muro-tarjeta ${tipo}`}>
      <header className="muro-cabecera">
        <div>
          <h2>{sector.nombre}</h2>
          {sector.principal && <p className="muro-principal">Polígono principal</p>}
        </div>
        <span className={`muro-pill ${tipo}`}>{sector.estado_label}</span>
      </header>
      <div className="muro-lienzo">
        {!puntos && <p className="muro-vacio">Cargando</p>}
        {puntos && puntos.length === 0 && <p className="muro-vacio">Sin lecturas</p>}
        {puntos && puntos.length > 0 && <GraficoReal puntos={puntos} alto={340} compacto />}
      </div>
      <p className="muro-pie">En {sector.estado_label} {cambio} · {tiempo}</p>
    </article>
  );
}

export function Muro() {
  const [reporte, setReporte] = useState(null);
  const [series, setSeries] = useState({});
  const [segundos, setSegundos] = useState(ESPERA);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vivo = true;
    let queda = ESPERA;

    const cargar = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
        if (!res.ok) throw new Error('estado');
        const data = await res.json();
        const sectores = (data.sectores || []).filter((s) => esVisible(s.nombre));
        const pares = await Promise.all(sectores.map(async (sector) => {
          const respuesta = await fetch(`${API_BASE}/api/sectores/${encodeURIComponent(sector.nombre)}/tendencia?horas=${HORAS}`);
          const lista = respuesta.ok ? await respuesta.json() : [];
          return [sector.nombre, Array.isArray(lista) ? lista : []];
        }));
        if (!vivo) return;
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

  const sectores = [...(reporte?.sectores || [])].sort((a, b) => Number(b.principal) - Number(a.principal));

  return (
    <div className="muro">
      <header className="muro-barra">
        <div className="muro-marca">
          <img src="/favicon.png" alt="Aura" />
          <div>
            <strong>Monitoreo sísmico</strong>
            <span>El Teniente</span>
          </div>
        </div>
        <div className="muro-barra-der">
          <p className="muro-lectura">
            Lectura
            <strong>{reporte ? fechaCorta(reporte.timestamp_geovita) : '—'}</strong>
          </p>
          <span className="muro-cuenta">Actualiza en {segundos}s</span>
          <a href="/">Ver detalle</a>
        </div>
      </header>

      {error && !reporte && <p className="muro-aviso">No se pudo leer la mina.</p>}

      <div className="muro-cuerpo">
        <div className="muro-grilla">
          {sectores.map((sector) => (
            <Tarjeta key={sector.nombre} sector={sector} registros={series[sector.nombre]} />
          ))}
        </div>
      </div>
    </div>
  );
}
