CREATE TABLE IF NOT EXISTS lecturas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  estado TEXT,
  estado_label TEXT,
  frec_24h TEXT,
  mag_min_24h TEXT,
  mag_max_24h TEXT,
  frec_7d TEXT,
  timestamp_scraping TEXT NOT NULL,
  UNIQUE (nombre, timestamp_scraping)
);

CREATE INDEX IF NOT EXISTS idx_lecturas_nombre_fecha ON lecturas (nombre, timestamp_scraping);
