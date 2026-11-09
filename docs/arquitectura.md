# Arquitectura

## Flujo general

```
Codelco (red mina)  →  Backend FastAPI (:8030)  →  cloudflared (trycloudflare)
                              ↓                            ↓
                         SQLite local              POST /api/puente + /api/respaldo
                              ↓                            ↓
                         Historial / tendencia     Worker Cloudflare + frontend
```

1. El PC de sala arranca lectura (`SISMICO_MODO=mina`) y un túnel HTTP/2 a `127.0.0.1:8030`.
2. Cuando cloudflared publica una URL `*.trycloudflare.com`, el supervisor avisa a la página.
3. El Worker guarda esa URL y reenvía las llamadas `/api/*` del navegador hacia el puente.
4. Cada lectura en vivo exitosa se guarda en SQLite; periódicamente se sube un **respaldo** (reporte + filas de tendencia) al Worker.
5. Si el túnel cae, la web puede seguir mostrando el último respaldo.

## Componentes

### `worker/`

- `POST /api/puente` — registra URL del túnel (header `x-puente-secreto`).
- `POST|GET /api/respaldo` — guarda/lee respaldo.
- Resto de `/api/*` — proxy al origen del túnel.
- Assets SPA desde el build de Vite.

### `backend/app/`

- `scraper.py` — descarga el resumen Codelco (todas las filas de la tabla; polígonos mapeados en `poligonos.py`).
- `scheduler.py` — ciclo ~10 s de revisión; lectura real cada 60 s si OK, cada 10 s si falla; `sala_log.py` escribe en `SISMICO_LOG`.
- `routers/sectores.py` — estado actual y tendencia.
- Modo mina: no usa copia local como “en vivo”; falla y reintenta.

### `frontend-react/`

- Módulos: Resumen, Monitoreo, Historial, Admin, Muro (`/muro`).
- Selección de polígonos del muro en `localStorage` (`aura.muro.poligonos`), por dispositivo.

### `arranque/`

- `arranque-sala.ps1` — loop: uvicorn oculto, cloudflared, reaviso de URL, `arranque.log`.
- `Instalar arranque.bat` / `iniciar-puente.ps1` — tarea programada “Sismicidad puente”.
- `Iniciar puente.bat` (raíz) — eleva e inicia el puente.

## Datos que no vienen de Codelco

El recuadro **Cota niveles** (UCL / NP / SNV) en GeoVita está hardcodeado en su HTML; no se calcula ni se scrapea del resumen. Si se replica en Aura, debe cargarse como referencia fija o tabla propia.
