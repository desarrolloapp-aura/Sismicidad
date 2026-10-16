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
  const base = 6 + Math.floor(aleatorio() * 6);
  let eventos = base + 2;
  let promedio = base;
  let referencia = base + 5;
  const puntos = [];
  for (let i = 0; i < 84; i += 1) {
    if (aleatorio() > 0.22) {
      const salto = 1 + Math.floor(aleatorio() * 3);
      eventos = Math.max(1, Math.min(18, eventos + (aleatorio() > 0.5 ? salto : -salto)));
    }
    if (i % 6 === 0) promedio = Math.max(2, Math.min(16, promedio + (aleatorio() > 0.5 ? 1 : -1)));
    if (i % 12 === 0 && aleatorio() > 0.3) referencia = base + 4 + Math.round(aleatorio() * 5);
    const dia = Math.floor(i / 12) + 1;
    const hora = (i % 12) * 2;
    puntos.push({
      fecha: `D${dia} ${String(hora).padStart(2, '0')}h`,
      eventos,
      promedio,
      referencia,
      magnitud: i % 7 === 0 ? Math.round((-0.25 - aleatorio() * 1.15) * 100) / 100 : null,
    });
  }
  return puntos;
}

export function GraficoPrueba({ nombreInicial }) {
  const inicial = POLIGONOS.includes(nombreInicial) ? nombreInicial : POLIGONOS[0];
  const [nombre, setNombre] = useState(inicial);
  const puntos = useMemo(() => serie(nombre), [nombre]);

  return (
    <section className="grafico-prueba">
      <div className="modulo-head">
        <div>
          <h3>Tendencia de ejemplo</h3>
          <p>Datos de prueba para ver el gráfico. No son una lectura de la mina ni un criterio de alerta.</p>
        </div>
        <select aria-label="Polígono de prueba" value={nombre} onChange={(event) => setNombre(event.target.value)}>
          {POLIGONOS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <p className="aviso-prueba">Datos de prueba</p>
      <div className="grafico-prueba-lienzo">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={puntos} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#d5dee8" strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fill: '#4d6074', fontSize: 11 }} interval={11} />
            <YAxis yAxisId="eventos" tick={{ fill: '#4d6074', fontSize: 11 }} width={42} label={{ value: 'Eventos', angle: -90, position: 'insideLeft', fill: '#4d6074', fontSize: 11 }} />
            <YAxis yAxisId="mag" orientation="right" domain={[-1.6, 0.2]} tick={{ fill: '#4d6074', fontSize: 11 }} width={48} label={{ value: 'Magnitud', angle: 90, position: 'insideRight', fill: '#4d6074', fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="eventos" type="stepAfter" dataKey="referencia" name="Referencia visual" stroke="#3aa0b8" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="eventos" type="stepAfter" dataKey="eventos" name="Eventos" stroke="#d64545" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line yAxisId="eventos" type="stepAfter" dataKey="promedio" name="Promedio móvil" stroke="#2c6cb0" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter yAxisId="mag" dataKey="magnitud" name="Magnitud" fill="#2f9e6b" shape="triangle" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
