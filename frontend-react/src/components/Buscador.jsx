import { useEffect, useRef, useState } from 'react';
import { Icono, TRAZOS } from './Icono';

export function Buscador({ sectores, onElegir, onCerrar }) {
  const [texto, setTexto] = useState('');
  const entrada = useRef(null);
  const consulta = texto.trim().toLowerCase();
  const lista = sectores.filter((sector) => !consulta || sector.nombre.toLowerCase().includes(consulta)).slice(0, 8);

  useEffect(() => {
    entrada.current?.focus();
    const cerrar = (evento) => {
      if (evento.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onCerrar]);

  return (
    <div className="buscador-fondo" onMouseDown={onCerrar}>
      <div className="buscador" role="dialog" aria-label="Buscar polígono" onMouseDown={(evento) => evento.stopPropagation()}>
        <div className="buscador-campo">
          <Icono size={16}>{TRAZOS.buscar}</Icono>
          <input
            ref={entrada}
            type="search"
            value={texto}
            placeholder="Buscar polígono"
            aria-label="Buscar polígono"
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && lista[0]) onElegir(lista[0].nombre);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul>
          {lista.length === 0 && <li className="buscador-vacio">No hay polígonos con ese nombre.</li>}
          {lista.map((sector) => (
            <li key={sector.nombre}>
              <button type="button" onClick={() => onElegir(sector.nombre)}>
                <span>{sector.nombre}</span>
                <span className={`badge ${sector.estado}`}>{sector.estado_label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
