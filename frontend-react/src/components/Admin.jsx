export function Admin() {
  return (
    <>
      <header className="header">
        <div className="header-title">
          <p className="header-kicker">Plataforma</p>
          <h1>Administración</h1>
        </div>
      </header>
      <main className="main-content admin-page">
        <p className="admin-lead">
          El menú de la izquierda ordena las secciones. Monitoreo sísmico es una de ellas.
          Las que se agreguen después aparecen en ese mismo menú.
        </p>
        <section className="admin-card">
          <h2>Módulos</h2>
          <ul className="admin-modules">
            <li>
              <strong>Monitoreo sísmico</strong>
              <span>Estado de los polígonos de El Teniente, frecuencia e historial.</span>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
