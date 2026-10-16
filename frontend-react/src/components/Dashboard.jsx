import { SectorCard } from './SectorCard';

const GRUPOS = ['Esta etapa', 'Etapa anterior'];

export function Dashboard({ sectores }) {
  return (
    <div className="tarjetas-poligonos">
      {GRUPOS.map((grupo) => {
        const delGrupo = sectores.filter((s) => (s.grupo || 'Esta etapa') === grupo);
        if (delGrupo.length === 0) return null;
        return (
          <section key={grupo} className="grupo-sector">
            <h3>{grupo === 'Esta etapa' ? 'Esta etapa del contrato' : 'Etapa anterior'}</h3>
            <div className="sectores-grid">
              {delGrupo.map((sector) => (
                <SectorCard key={sector.nombre} sector={sector} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
