import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts';
import { API_BASE } from '../api';
import { GraficoPrueba } from './GraficoPrueba';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const peligro = payload[0].payload.estado === 'danger';
    return (
      <div className="grafico-tooltip">
        <p className="grafico-tooltip-hora">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="grafico-tooltip-fila">
            <i style={{ background: entry.color }} />
            <span>{entry.name}:</span>
            <strong>{entry.value.toFixed(2)}</strong>
          </div>
        ))}
        <div className="grafico-tooltip-estado">
          <span>Estado: </span>
          <strong className={peligro ? 'rojo' : 'verde'}>{payload[0].payload.estado_label}</strong>
        </div>
      </div>
    );
  }
  return null;
};

export function Graficos() {
  const [sectores, setSectores] = useState([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
        const data = await res.json();
        const nombres = data.sectores.map(s => s.nombre);
        setSectores(nombres);
        if (nombres.length > 0) setSelectedSector((actual) => actual || nombres[0]);
      } catch (err) {
        console.error("Error cargando sectores:", err);
      }
    };
    fetchSectores();
  }, []);

  useEffect(() => {
    if (!selectedSector) return undefined;
    setLoading(true);
    const fetchTendencia = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/${encodeURIComponent(selectedSector)}/tendencia?limit=60`);
        const data = await res.json();

        const formattedData = data.map(snapshot => {
          const d = new Date(snapshot.timestamp_scraping);
          const timeLabel = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

          return {
            time: timeLabel,
            Frecuencia: Number.parseFloat(snapshot.frec_24h) || 0,
            estado: snapshot.estado,
            estado_label: snapshot.estado_label
          };
        });

        setChartData(formattedData);
      } catch (err) {
        console.error("Error cargando tendencia:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTendencia();
    const intervalo = setInterval(fetchTendencia, 60000);
    return () => clearInterval(intervalo);
  }, [selectedSector]);

  const dangerAreas = [];
  let currentDangerStart = null;

  chartData.forEach((point, index) => {
    if (point.estado === 'danger' && currentDangerStart === null) {
      currentDangerStart = point.time;
    } else if (point.estado !== 'danger' && currentDangerStart !== null) {
      dangerAreas.push({ start: currentDangerStart, end: chartData[index - 1].time });
      currentDangerStart = null;
    }
  });
  if (currentDangerStart !== null) {
    dangerAreas.push({ start: currentDangerStart, end: chartData[chartData.length - 1].time });
  }

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h1>Frecuencia sísmica</h1>
          <p>Frecuencia de las últimas 24 horas por polígono, con las lecturas que guarda el sistema.</p>
        </div>
        <select
          className="campo"
          aria-label="Polígono"
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
        >
          {sectores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading && chartData.length === 0 ? (
        <div className="tarjeta estado-carga">
          <div className="loading-spinner" />
          <p>Cargando datos históricos...</p>
        </div>
      ) : chartData.length === 0 ? (
        <GraficoPrueba nombreFijo={selectedSector} />
      ) : (
        <div className="tarjeta grafico-real">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} tickMargin={12} minTickGap={30} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#64748b', fontSize: 12 }}
                label={{ value: 'Frec', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              {dangerAreas.map((area, idx) => (
                <ReferenceArea key={idx} x1={area.start} x2={area.end} fill="rgba(225, 29, 72, 0.08)" strokeOpacity={0} />
              ))}
              <Line
                type="monotone"
                dataKey="Frecuencia"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
