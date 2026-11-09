import { nombreVista } from '../lib/nombreVista';

/**
 * Lista de polígonos con checkbox para el muro de este dispositivo.
 * @param {object[]} catalogo - sectores de la API (todos)
 * @param {string[]} seleccion - nombres Codelco marcados
 * @param {(nombres: string[]) => void} onChange
 */
export function SelectorMuro({ catalogo, seleccion, onChange }) {
  const set = new Set(seleccion || []);

  function toggle(nombre) {
    const siguiente = set.has(nombre)
      ? seleccion.filter((n) => n !== nombre)
      : [...seleccion, nombre];
    onChange(siguiente);
  }

  function todos() {
    onChange((catalogo || []).map((s) => s.nombre));
  }

  function ninguno() {
    onChange([]);
  }

  const grupos = {};
  for (const sector of catalogo || []) {
    const g = sector.grupo || 'Otros';
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(sector);
  }

  return (
    <div className="selector-muro">
      <div className="selector-muro-acciones">
        <button type="button" onClick={todos}>Marcar todos</button>
        <button type="button" onClick={ninguno}>Quitar todos</button>
        <span>{set.size} en el muro de este equipo</span>
      </div>
      {Object.entries(grupos).map(([grupo, items]) => (
        <div key={grupo} className="selector-muro-grupo">
          <h4>{grupo}</h4>
          <ul>
            {items.map((sector) => (
              <li key={sector.nombre}>
                <label>
                  <input
                    type="checkbox"
                    checked={set.has(sector.nombre)}
                    onChange={() => toggle(sector.nombre)}
                  />
                  <span className="selector-muro-nombre">{nombreVista(sector)}</span>
                  {sector.nombre_vista && sector.nombre_vista !== sector.nombre && (
                    <span className="selector-muro-codelco">{sector.nombre}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {(catalogo || []).length === 0 && (
        <p className="selector-muro-vacio">Sin polígonos en la lectura actual.</p>
      )}
    </div>
  );
}
