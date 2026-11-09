# Operación en la mina (puente)

## Requisitos del PC de sala

- Windows, red Codelco (acceso a la página sísmica interna).
- Sin VPN que bloquee el túnel.
- PC encendido; tarea “Sismicidad puente” habilitada.
- Archivos locales (no van al Git): `python-portable/`, `arranque/cloudflared.exe`, `puente.secreto` (mismo valor que el secreto del Worker).

## Primera vez

1. Copiar carpeta `sismicidad-mina` (o este repo + binarios portables).
2. Colocar `puente.secreto` en la raíz de esa carpeta.
3. Abrir `arranque\Instalar arranque.bat` (UAC).
4. Abrir `Iniciar puente.bat` o `arranque\Iniciar puente` según el empaquetado.

## Día a día

- Al iniciar Windows, si la tarea quedó habilitada, el puente arranca solo.
- Si hace falta: `Iniciar puente.bat`.
- Logs:
  - `arranque/arranque.log` — arranque, túnel, “Página avisada”, **reintentos Codelco**.
  - `arranque/arranque-tunel.log` — salida de cloudflared.

### Mensajes útiles en `arranque.log`

| Mensaje | Significado |
|---------|-------------|
| `Arranque de sala iniciado` / `Lectura iniciada` / `Tunel iniciado` | Procesos arriba |
| `Pagina avisada: https://….trycloudflare.com` | Worker actualizado |
| `Sin red Codelco. Reconectando en 10 s.` | Falló la lectura; reintento |
| `Red Codelco recuperada.` | Volvió la lectura en vivo |

## Prueba fuera de la mina

El túnel y el aviso a la página pueden funcionar en Wi‑Fi normal. La lectura Codelco **no**: es normal ver reintentos en el log. Validación real solo en red Codelco.

## Diseño del muro

Cambios visuales del frontend se publican con `npx wrangler deploy` desde el repo web. **No** hace falta reenviar la carpeta mina solo por CSS/UI.
