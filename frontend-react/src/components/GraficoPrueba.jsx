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
const VENTANA = POR_DIA;

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

  const total = DIAS * POR_DIA + VENTANA;
  const nivelBase = 5 + aleatorio() * 6;
  const eventos = [];
  let valor = nivelBase;
  for (let i = 0; i < total; i += 1) {
    const nivel = nivelBase + Math.sin(i / 38) * nivelBase * 0.55 + Math.sin(i / 11) * 1.5;
    if (aleatorio() > 0.5) valor += (nivel - valor) * 0.3 + (aleatorio() - 0.5) * 3.5;
    eventos.push(Math.max(0, Math.round(valor)));
  }

  const puntos = [];
  let superior = 0;
  let inferior = 0;
  for (let i = VENTANA; i < total; i += 1) {
    const tramo = eventos.slice(i - VENTANA, i);
    const promedio = tramo.reduce((suma, n) => suma + n, 0) / VENTANA;
    if ((i - VENTANA) % 6 === 0) {
      const margen = 2 * Math.sqrt(promedio) + 1;
      superior = Math.round(promedio + margen);
      inferior = Math.max(0, Math.round(promedio - margen));
    }
    const indice = i - VENTANA;
    const dia = Math.floor(indice / POR_DIA) + 1;
    const minutos = (indice % POR_DIA) * (60 / POR_HORA);
    const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    puntos.push({
      fecha: `Día ${dia} ${hora}`,
      eventos: eventos[i],
      promedio: Math.round(promedio * 10) / 10,
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

export function GraficoPrueba({ nombreInicial }) {
  const inicial = POLIGONOS.includes(nombreInicial) ? nombreInicial : POLIGONOS[0];
  const [nombre, setNombre] = useState(inicial);
  const puntos = useMemo(() => serie(nombre), [nombre]);
  const marcas = useMemo(() => puntos.filter((_, i) => i % (6 * POR_HORA) === 0).map((p) => p.fecha), [puntos]);

  return (
    <section className="grafico-prueba">
      <div className="modulo-head">
        <div>
          <h3>Tendencia de ejemplo</h3>
          <p>Datos de prueba para ver el gráfico. No son una lectura de la mina y la banda no es un criterio de alerta.</p>
        </div>
        <select aria-label="Polígono de prueba" value={nombre} onChange={(event) => setNombre(event.target.value)}>
          {POLIGONOS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <p className="aviso-prueba">Datos de prueba</p>
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
            <Line yAxisId="eventos" type="linear" dataKey="promedio" name="Promedio móvil 24 h" stroke="#1f3fd6" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            <Line yAxisId="eventos" type="stepAfter" dataKey="eventos" name="Eventos" stroke="#e02424" strokeWidth={2.4} dot={false} isAnimationActive={false} />
            <Scatter yAxisId="mag" dataKey="magnitud" name="Magnitud" fill="#1f8a2e" stroke="#0d3d14" shape="triangle" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
