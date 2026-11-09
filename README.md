# Sismicidad — Monitoreo sísmico El Teniente

Plataforma Aura Ingeniería para leer el resumen sísmico de Codelco (GeoVita/IMS en la red de mina), mostrarlo en la web y mantener un respaldo cuando se corta el puente.

**Producción:** https://sismicidad.desarrolloapp.workers.dev  
**Repositorio:** https://github.com/desarrolloapp-aura/Sismicidad

## Qué hace

| Pieza | Rol |
|--------|-----|
| **Worker Cloudflare** | Sirve el frontend, guarda la URL del túnel, reenvía API al PC de la mina y almacena respaldo (KV/D1). |
| **Backend (FastAPI)** | Lee Codelco, guarda historial SQLite, expone sectores/tendencia y envía respaldo a la página. |
| **Frontend (React)** | Resumen, monitoreo, historial, administración y **muro de gráficos** tipo GeoVita. |
| **Puente en sala** | En el PC de la mina: uvicorn + cloudflared (HTTP/2 / trycloudflare) y aviso a `/api/puente`. |

## Modos (`SISMICO_MODO`)

- **`mina`** — Solo lectura en vivo de Codelco (`10.18.18.83`). Si no hay red, reintenta cada ~10 s y lo anota en `arranque/arranque.log`.
- **`oficina`** — Consume el reporte desde `PUENTE_URL` (túnel).
- **`local`** — Intenta Codelco; si falla, usa `datos/pagina-guardada` (sin mezclar esa copia al historial como lectura en vivo).

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Operación en la mina (puente)](docs/operacion-mina.md)
- [Muro y administración](docs/muro-y-admin.md)
- [Avance noviembre 2026](docs/avance-2026-11.md)

## Desarrollo rápido

```bash
# Backend
cd backend
# con venv o python-portable
set SISMICO_MODO=local
python -m uvicorn app.main:app --host 127.0.0.1 --port 8030

# Frontend
cd frontend-react
npm install
npm run dev
```

Variables: ver `.env.example`. El secreto del puente **no** va al repo (`puente.secreto` / secreto Worker).

## Despliegue web

```bash
npx wrangler deploy
```

`wrangler.json` construye `frontend-react` y publica assets + Worker.

## Carpeta de sala (`sismicidad-mina`)

Copia operativa para el PC de mina (python-portable, cloudflared, `arranque/`). Los cambios de **diseño del muro** solo requieren redeploy de Cloudflare; el PC de mina solo necesita actualización si cambió el puente/logs/scraper.

## Seguridad

No commitear: `puente.secreto`, `.env`, `cloudflared.exe`, `python-portable/`, bases SQLite ni logs.
