export function Header({ secondsLeft }) {
  return (
    <header className="header">
      <div className="header-title">
        <p className="header-kicker">Aura · El Teniente</p>
        <h1>Monitoreo sísmico</h1>
      </div>
      <div className="header-right">
        <span className="live-badge">En línea</span>
        <span className="countdown-badge">Actualiza en {secondsLeft}s</span>
      </div>
    </header>
  );
}
