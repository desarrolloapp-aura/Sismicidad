import { useMemo, useState } from 'react';
import {
  CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';

const POLIGONOS = [
  'Bajo Diamante Esmeralda',
  'Esmeralda Panel 1',
  'Esmeralda Bloque 1',
  'Esmeralda Extension Norte Bloque 2',
  'Esmeralda Extension Fw Bloque 2',
];

const DIAS = 7;
const POR_HORA = 2;
const POR_DIA = 24 * POR_HORA;
const VENTANA = 3 * POR_DIA;
const VENTANA_BANDA = 3 * POR_DIA;

function semilla(texto) {
  let n = 7;
  for (const letra of texto) n = (n * 33 + letra.charCodeAt(0)) % 1000003;
  return n;
}

function serie(nombre) {
  let x = semilla(nombre);
  const aleatorio = () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };

  const total = DIAS * POR_DIA + VENTANA_BANDA;
  const nivelBase = 6 + aleatorio() * 4;
  const eventos = [];
  let valor = nivelBase;
  for (let i = 0; i < total; i += 1) {
    const nivel = nivelBase + Math.sin(i / 26) * nivelBase * 0.5;
    if (aleatorio() > 0.55) valor += (nivel - valor) * 0.35 + (aleatorio() - 0.5) * 3;
    eventos.push(Math.max(1, Math.round(valor)));
  }

  const media = (desde, hasta) => {
    let suma = 0;
    for (let k = desde; k < hasta; k += 1) suma += eventos[k];
    return suma / (hasta - desde);
  };

  const puntos = [];
  let superiorBase = null;
  let inferiorBase = null;
  let salto = 0;
  let saltoSuperior = 0;
  let saltoInferior = 0;
  for (let i = VENTANA_BANDA; i < total; i += 1) {
    const promedio = media(i - VENTANA, i);
    const lento = media(i - VENTANA_BANDA, i);
    const margen = 2 * Math.sqrt(lento) + 1;
    const superiorCalculado = lento + margen;
    const inferiorCalculado = Math.max(0, lento - margen);
    if (superiorBase === null || Math.abs(superiorCalculado - superiorBase) >= 1) superiorBase = Math.round(superiorCalculado);
    if (inferiorBase === null || Math.abs(inferiorCalculado - inferiorBase) >= 1) inferiorBase = Math.round(inferiorCalculado);

    if (salto > 0) {
      salto -= 1;
    } else {
      saltoSuperior = 0;
      saltoInferior = 0;
      if (aleatorio() > 0.97) {
        salto = 1 + Math.floor(aleatorio() * 3);
        if (aleatorio() > 0.4) saltoSuperior = aleatorio() > 0.5 ? 1 : -1;
        else saltoInferior = -1;
      }
    }
    const superior = superiorBase + saltoSuperior;
    const inferior = Math.max(0, inferiorBase + saltoInferior);
    const indice = i - VENTANA_BANDA;
    const dia = Math.floor(indice / POR_DIA) + 1;
    const minutos = (indice % POR_DIA) * (60 / POR_HORA);
    const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    puntos.push({
      fecha: `Día ${dia} ${hora}`,
      eventos: eventos[i],
      promedio: Math.round(promedio * 5) / 5,
      superior,
      inferior,
      magnitud: aleatorio() > 0.93 ? Math.round((-0.2 - aleatorio() * 1.3) * 100) / 100 : null,
    });
  }
  return puntos;
}

function etiquetaDia(fecha) {
  return fecha.endsWith(' 00:00') ? fecha.replace(' 00:00', '') : '';
}

export function GraficoPrueba({ nombreInicial, nombreFijo }) {
  const inicial = POLIGONOS.includes(nombreInicial) ? nombreInicial : POLIGONOS[0];
  const [elegido, setElegido] = useState(inicial);
  const nombre = nombreFijo || elegido;
  const puntos = useMemo(() => serie(nombre), [nombre]);
  const marcas = useMemo(() => puntos.filter((_, i) => i % (6 * POR_HORA) === 0).map((p) => p.fecha), [puntos]);

  return (
    <section className="tarjeta grafico-prueba">
      <header className="tarjeta-head grafico-prueba-head">
        <div>
          <h2>
            Tendencia de ejemplo
            <span className="badge prueba">Datos de prueba</span>
          </h2>
          <p>{nombre}. No son una lectura de la mina y la banda no es un criterio de alerta.</p>
        </div>
        {!nombreFijo && (
          <select className="campo" aria-label="Polígono de prueba" value={nombre} onChange={(event) => setElegido(event.target.value)}>
            {POLIGONOS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        )}
      </header>
      <div className="grafico-prueba-lienzo">
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart data={puntos} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke="#7b8794" strokeDasharray="2 4" />
            <XAxis
              dataKey="fecha"
              ticks={marcas}
              interval={0}
              tickFormatter={etiquetaDia}
              tick={{ fill: '#1f2a36', fontSize: 12, fontWeight: 600 }}
              stroke="#1f2a36"
            />
            <YAxis
              yAxisId="eventos"
              tick={{ fill: '#1f2a36', fontSize: 12 }}
              stroke="#1f2a36"
              width={46}
              allowDecimals={false}
              label={{ value: 'N° eventos', angle: -90, position: 'insideLeft', fill: '#1f2a36', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              yAxisId="mag"
              orientation="right"
              domain={[-1.6, 0.2]}
              ticks={[-1.6, -1.4, -1.2, -1, -0.8, -0.6, -0.4, -0.2, 0, 0.2]}
              tick={{ fill: '#1f2a36', fontSize: 11 }}
              stroke="#1f2a36"
              width={48}
              label={{ value: 'Magnitud', angle: 90, position: 'insideRight', fill: '#1f2a36', fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip />
            <Legend />
            <Line yAxisId="eventos" type="stepAfter" dataKey="superior" name="Banda de ejemplo" stroke="#17b3b3" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            <Line yAxisId="eventos" type="stepAfter" dataKey="inferior" name="Banda inferior de ejemplo" stroke="#17b3b3" strokeWidth={2.4} dot={false} isAnimationActive={false} legendType="none" />
            <Line yAxisId="eventos" type="stepAfter" dataKey="promedio" name="Promedio móvil 72 h" stroke="#1f3fd6" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            <Line yAxisId="eventos" type="stepAfter" dataKey="eventos" name="Eventos" stroke="#e02424" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            <Scatter yAxisId="mag" dataKey="magnitud" name="Magnitud" fill="#1f8a2e" stroke="#0d3d14" shape="triangle" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
