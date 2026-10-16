const PENDIENTES = [
  ['Mapa de polígonos', 'No hay coordenadas ni geometrías en los datos.'],
  ['Análisis y comparación de períodos', 'La fuente actual entrega una lectura, no una serie para comparar períodos.'],
  ['Reportes técnicos', 'Falta definir el formato y la fuente histórica que los alimente.'],
  ['Umbrales y reglas', 'El único criterio vigente es el estado de la tabla: Centro, Inferior o Superior.'],
  ['Usuarios y permisos', 'La plataforma no tiene inicio de sesión.'],
  ['Registro de actividad', 'No hay un registro persistente de acciones de administración.'],
];

export function Admin() {
  return (
    <section className="modulo">
      <div className="modulo-head">
        <div>
          <h2>Administración</h2>
          <p>Lo que está en el menú funciona con los datos actuales. Lo demás queda pendiente, sin pantallas vacías.</p>
        </div>
      </div>
      <div className="admin-grid">
        <article className="admin-card">
          <h3>En uso</h3>
          <ul className="admin-modules">
            <li><strong>Resumen general</strong><span>Conteo de polígonos, Centro, alertas y hora de la lectura.</span></li>
            <li><strong>Monitoreo sísmico</strong><span>Tabla y tarjetas de la lectura disponible.</span></li>
            <li><strong>Frecuencia sísmica</strong><span>Gráfico cuando existen lecturas sucesivas.</span></li>
            <li><strong>Historial</strong><span>Mediciones que envía el computador de la mina.</span></li>
          </ul>
        </article>
        <article className="admin-card">
          <h3>Pendiente</h3>
          <ul className="admin-modules">
            {PENDIENTES.map(([titulo, detalle]) => (
              <li key={titulo}><strong>{titulo}</strong><span>{detalle}</span></li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
