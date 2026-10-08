import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts';
import { API_BASE } from '../api';

// Tooltip personalizado para el gráfico
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(99, 179, 237, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        color: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        fontSize: '0.85rem'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--accent)' }}>{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></span>
            <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
            <span style={{ fontWeight: 'bold' }}>{entry.value.toFixed(2)}</span>
          </div>
        ))}
        {/* Mostrar el estado en el tooltip si está disponible en el payload original */}
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Estado: </span>
          <span style={{ 
            fontWeight: 'bold', 
            color: payload[0].payload.estado === 'danger' ? 'var(--danger-start)' : 'var(--ok-start)'
          }}>
            {payload[0].payload.estado_label}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function Graficos({ secondsLeft }) {
  const [sectores, setSectores] = useState([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Cargar la lista de sectores disponibles
  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
        const data = await res.json();
        const nombres = data.sectores.map(s => s.nombre);
        setSectores(nombres);
        if (nombres.length > 0 && !selectedSector) {
          setSelectedSector(nombres[0]); // Seleccionar el primero por defecto
        }
      } catch (err) {
        console.error("Error cargando sectores:", err);
      }
    };
    fetchSectores();
  }, []);

  // 2. Cargar los datos de tendencia del sector seleccionado
  useEffect(() => {
    const fetchTendencia = async () => {
      if (!selectedSector) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/sectores/${encodeURIComponent(selectedSector)}/tendencia?limit=60`);
        const data = await res.json();
        
        // Transformar los datos para Recharts
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
  }, [selectedSector, secondsLeft]); // Se actualiza cuando cambia el sector o pasa 1 minuto

  // Identificar áreas de peligro para dibujarlas de fondo rojo
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
    <div id="tab-graficos" className="tab-panel active" style={{ padding: '20px 0' }}>
      <div className="sector-header" style={{ marginBottom: '16px' }}>
        <h2>Frecuencia últimas 24 horas</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SECTOR:</label>
          <select 
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent)',
              background: 'rgba(99, 179, 237, 0.1)',
              color: 'var(--text-primary)',
              fontWeight: 'bold',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {sectores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="sector-card" style={{ padding: '24px 20px', height: '500px' }}>
        {loading && chartData.length === 0 ? (
          <div className="loading-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="loading-spinner"></div>
            <p>Cargando datos históricos...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="error-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p>No hay datos suficientes para este sector.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="var(--text-muted)" 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                tickMargin={12}
                minTickGap={30}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                label={{ value: 'Frec', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              
              {/* Áreas rojas de fondo cuando el estado fue Peligro */}
              {dangerAreas.map((area, idx) => (
                <ReferenceArea 
                  key={idx} 
                  x1={area.start} 
                  x2={area.end} 
                  fill="rgba(214, 48, 49, 0.15)" 
                  strokeOpacity={0}
                />
              ))}

              <Line 
                type="monotone" 
                dataKey="Frecuencia" 
                stroke="var(--accent)" 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, fill: 'var(--bg-card)', stroke: 'var(--accent)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
