import { useEffect, useState } from 'react';
import { API_BASE } from '../api';
import {
  guardarSeleccionMuro,
  leerSeleccionMuro,
  seleccionEfectiva,
} from '../lib/muroPoligonos';
import { SelectorMuro } from './SelectorMuro';

export function Admin() {
  const [catalogo, setCatalogo] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sectores/estado-actual`);
        if (!res.ok) throw new Error('estado');
        const data = await res.json();
        const sectores = data.sectores || [];
        if (!vivo) return;
        setCatalogo(sectores);
        const actual = leerSeleccionMuro();
        setSeleccion(actual === null ? seleccionEfectiva(sectores) : actual);
        setError(false);
      } catch {
        if (vivo) setError(true);
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  function cambiar(nombres) {
    setSeleccion(nombres);
    guardarSeleccionMuro(nombres);
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1800);
  }

  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h2>Administración</h2>
          <p>
            Catálogo completo de polígonos. Lo que marques aquí se muestra en el
            <strong> muro de este equipo</strong>; otros monitores de la red no se ven afectados.
          </p>
        </div>
        <a className="admin-muro-link" href="/muro">Abrir muro</a>
      </div>

      {cargando && <p className="admin-aviso">Cargando polígonos…</p>}
      {error && <p className="admin-aviso admin-aviso-error">No se pudo leer la mina.</p>}
      {guardado && <p className="admin-aviso admin-aviso-ok">Guardado en este dispositivo.</p>}

      {!cargando && !error && (
        <article className="admin-card">
          <h3>Polígonos en el muro</h3>
          <p className="admin-card-desc">
            Catálogo completo del resumen Codelco (todas las filas de la tabla). Los de Aura tienen nombre de vista; el resto aparece como en Codelco. El muro de este equipo solo muestra los que marques.
          </p>
          <SelectorMuro catalogo={catalogo} seleccion={seleccion} onChange={cambiar} />
        </article>
      )}
    </section>
  );
}
