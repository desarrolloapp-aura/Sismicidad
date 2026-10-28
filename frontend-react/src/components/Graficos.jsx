import { useState, useEffect } from 'react';
import { API_BASE } from '../api';
import { Tendencia } from './Tendencia';
import { esVisible } from '../visibles';

export function Graficos() {
  const [sectores, setSectores] = useState([]);
  const [selectedSector, setSelectedSector] = useState('');

  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
        const data = await res.json();
        const lista = data.sectores.filter((s) => esVisible(s.nombre));
        const nombres = lista.map(s => s.nombre);
        const principal = lista.find(s => s.principal)?.nombre;
        setSectores(nombres);
        if (nombres.length > 0) setSelectedSector((actual) => actual || principal || nombres[0]);
      } catch (err) {
        console.error("Error cargando sectores:", err);
      }
    };
    fetchSectores();
  }, []);

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h1>Frecuencia sísmica</h1>
          <p>Frecuencia de 24 h de cada polígono en los últimos 7 días, con las lecturas que guarda el PC de la mina.</p>
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

      <Tendencia nombre={selectedSector} />
    </section>
  );
}
