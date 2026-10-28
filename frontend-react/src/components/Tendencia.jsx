import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import { API_BASE } from '../api';
import { LienzoPrueba } from './GraficoPrueba';

const HORAS = 168;
const MINUTO = 60000;
const HORA = 60 * MINUTO;
const PASOS_MINUTOS = [5, 10, 15, 30, 60, 120, 180, 360, 720];
const TINTA = '#1f2a36';

function numero(texto) {
  if (texto == null || texto === '' || texto === '----') return null;
  const valor = Number.parseFloat(String(texto).replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

function fechaLarga(ms) {
  return new Date(ms).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
}

function fechaDia(ms) {
  return new Date(ms).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '');
}

function hora(ms) {
  return new Date(ms).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fechaHora(ms) {
  return `${fechaLarga(ms)}, ${hora(ms)}`;
}

function esMedianoche(ms) {
  const fecha = new Date(ms);
  return fecha.getHours() === 0 && fecha.getMinutes() === 0;
}

function preparar(registros) {
  const puntos = registros
    .map((r) => ({
      t: new Date(r.timestamp_scraping).getTime(),
      frec: numero(r.frec_24h),
      media7: numero(r.frec_7d),
      magMax: numero(r.mag_max_24h),
      estado: r.estado,
    }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);

  let magAnterior = null;
  return puntos.map((p) => {
    const conEventos = p.frec != null && p.frec > 0;
    const magnitud = conEventos && p.magMax != null && p.magMax !== magAnterior ? p.magMax : null;
    if (conEventos) magAnterior = p.magMax;
    return { ...p, magnitud };
  });
}

function eje(desde, hasta) {
  if (hasta - desde < 10 * MINUTO) {
    desde -= 30 * MINUTO;
    hasta += 30 * MINUTO;
  }
  const marcas = [];
  const dia = new Date(desde);
  dia.setHours(0, 0, 0, 0);
  const ultimo = new Date(hasta);
  ultimo.setHours(0, 0, 0, 0);
  if (ultimo.getTime() > dia.getTime()) {
    while (dia.getTime() <= hasta) {
      const t = Math.max(dia.getTime(), desde);
      if (t <= hasta) marcas.push(t);
      dia.setDate(dia.getDate() + 1);
    }
    return { dominio: [desde, hasta], marcas, formato: fechaDia };
  }
  const paso = (PASOS_MINUTOS.find((m) => (hasta - desde) / (m * MINUTO) <= 8) || 720) * MINUTO;
  const desfase = new Date(desde).getTimezoneOffset() * MINUTO;
  for (let t = Math.ceil((desde - desfase) / paso) * paso + desfase; t <= hasta; t += paso) marcas.push(t);
  return {
    dominio: [desde, hasta],
    marcas,
    formato: (ms) => {
      if (esMedianoche(ms)) return fechaLarga(ms);
      return ms === marcas[0] ? fechaHora(ms) : hora(ms);
    },
  };
}

function zonasAlerta(puntos) {
  const zonas = [];
  let inicio = null;
  puntos.forEach((p, i) => {
    if (p.estado === 'danger' && inicio === null) inicio = p.t;
    const termina = p.estado !== 'danger' || i === puntos.length - 1;
    if (inicio !== null && termina) {
      zonas.push({ x1: inicio, x2: p.t });
      inicio = null;
    }
  });
  return zonas;
}

function escalaMagnitud(puntos) {
  const valores = puntos.map((p) => p.magnitud).filter((m) => m != null);
  if (valores.length === 0) return { dominio: [-1.6, 0.2], marcas: [-1.6, -1.4, -1.2, -1, -0.8, -0.6, -0.4, -0.2, 0, 0.2] };
  const minimo = Math.floor((Math.min(...valores) - 0.1) * 5) / 5;
  const maximo = Math.ceil((Math.max(...valores) + 0.1) * 5) / 5;
  const paso = maximo - minimo > 2.4 ? 0.5 : 0.2;
  const desde = Math.floor(minimo / paso) * paso;
  const marcas = [];
  for (let m = desde; m <= maximo + 1e-9; m += paso) marcas.push(Math.round(m * 10) / 10);
  return { dominio: [marcas[0], marcas[marcas.length - 1]], marcas };
}

function TooltipReal({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const filas = payload.filter((item) => item.dataKey !== 't' && item.value != null);
  return (
    <div className="grafico-tooltip">
      <p className="grafico-tooltip-hora">{fechaHora(label)}</p>
      {filas.map((item) => (
        <p key={item.dataKey} className="grafico-tooltip-fila">
          <i style={{ background: item.color }} />
          <span>{item.name}</span>
          <strong>{item.value}</strong>
        </p>
      ))}
    </div>
  );
}

function GraficoReal({ puntos }) {
  const { dominio, marcas, formato } = eje(puntos[0].t, puntos[puntos.length - 1].t);
  const magnitud = escalaMagnitud(puntos);
  const zonas = zonasAlerta(puntos);

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={puntos} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} stroke="#7b8794" strokeDasharray="2 4" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={dominio}
          ticks={marcas}
          tickFormatter={formato}
          interval={0}
          tick={{ fill: TINTA, fontSize: 12, fontWeight: 600 }}
          stroke={TINTA}
        />
        <YAxis
          yAxisId="frec"
          tick={{ fill: TINTA, fontSize: 12 }}
          stroke={TINTA}
          width={46}
          allowDecimals={false}
          label={{ value: 'N° eventos', angle: -90, position: 'insideLeft', fill: TINTA, fontSize: 12, fontWeight: 600 }}
        />
        <YAxis
          yAxisId="mag"
          orientation="right"
          domain={magnitud.dominio}
          ticks={magnitud.marcas}
          allowDataOverflow
          tick={{ fill: TINTA, fontSize: 11 }}
          stroke={TINTA}
          width={48}
          label={{ value: 'Magnitud', angle: 90, position: 'insideRight', fill: TINTA, fontSize: 12, fontWeight: 600 }}
        />
        <Tooltip content={<TooltipReal />} />
        <Legend />
        {zonas.map((zona) => (
          <ReferenceArea key={zona.x1} yAxisId="frec" x1={zona.x1} x2={zona.x2} fill="rgba(225, 29, 72, 0.12)" strokeOpacity={0} />
        ))}
        <Line yAxisId="frec" type="stepAfter" dataKey="media7" name="Media 7 días" stroke="#1f3fd6" strokeWidth={2.4} dot={false} connectNulls isAnimationActive={false} />
        <Line yAxisId="frec" type="stepAfter" dataKey="frec" name="Media diaria" stroke="#e02424" strokeWidth={2.4} dot={false} connectNulls isAnimationActive={false} />
        <Scatter yAxisId="mag" dataKey="magnitud" name="Magnitud máxima" fill="#1f8a2e" stroke="#0d3d14" shape="triangle" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Tendencia({ nombre, poligonos = [], inicial }) {
  const [elegido, setElegido] = useState('');
  const actual = nombre ?? (elegido || inicial || '');
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);
  const puntos = useMemo(() => preparar(registros), [registros]);
  const real = puntos.length > 0;

  useEffect(() => {
    if (!actual) return undefined;
    let vigente = true;
    setRegistros([]);
    setCargando(true);
    const traer = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/${encodeURIComponent(actual)}/tendencia?horas=${HORAS}`);
        const datos = res.ok ? await res.json() : [];
        if (vigente) setRegistros(Array.isArray(datos) ? datos : []);
      } catch {
        /* se mantiene lo último que llegó */
      } finally {
        if (vigente) setCargando(false);
      }
    };
    traer();
    const intervalo = setInterval(traer, MINUTO);
    return () => {
      vigente = false;
      clearInterval(intervalo);
    };
  }, [actual]);

  return (
    <section className="tarjeta grafico-prueba">
      <header className="tarjeta-head grafico-prueba-head">
        <div>
          <h2>
            {real ? 'Tendencia últimos 7 días' : 'Tendencia de ejemplo'}
            {!real && <span className="badge prueba">Datos de prueba</span>}
          </h2>
          <p>
            {real
              ? `${actual}. La roja es la media diaria y la azul es la media de 7 días, como las publica Codelco. Del ${fechaHora(puntos[0].t)} al ${fechaHora(puntos[puntos.length - 1].t)}.`
              : `${actual || 'Polígono de ejemplo'}. No son una lectura de la mina y la banda no es un criterio de alerta.`}
          </p>
        </div>
        {nombre == null && poligonos.length > 0 && (
          <select className="campo" aria-label="Polígono" value={actual} onChange={(event) => setElegido(event.target.value)}>
            {poligonos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
      </header>
      <div className="grafico-prueba-lienzo">
        {cargando && !real ? (
          <div className="estado-carga">
            <div className="loading-spinner" />
            <p>Cargando lecturas...</p>
          </div>
        ) : real ? (
          <GraficoReal puntos={puntos} />
        ) : (
          <LienzoPrueba nombre={actual} />
        )}
      </div>
    </section>
  );
}
