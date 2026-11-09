# Muro de gráficos y administración

## Muro (`/muro`)

Pantalla tipo GeoVita / Aura:

- Tarjetas por polígono seleccionado: estado (Centro / Inferior / Superior), último cambio, tiempo en estado, gráfico de tendencia.
- Estado **arriba** del área del gráfico (alineado al gráfico); metadatos en **recuadro** compacto a la izquierda.
- Clic en el gráfico → modal ampliado.
- Pie de contactos de emergencia (barra ancha, iconos, números en amarillo).
- Colores: degradé suave (un poco más oscuro a la izquierda, más claro a la derecha).

La lectura de estados es la de Codelco en vivo (vía puente). El **nombre** del polígono no cambia; cambia el **estado**.

## Selección por dispositivo

- Clave `localStorage`: `aura.muro.poligonos`.
- Cada monitor/PC elige qué polígonos mostrar; no afecta a otros equipos.
- Si nunca se configuró, por defecto se usan los del grupo «Esta etapa».

## Administración

- Ruta de admin en la app: catálogo completo del resumen Codelco (todas las filas scrapadas).
- Checkboxes para marcar polígonos del muro de **este** equipo.
- Enlace “Abrir muro”.

El menú lateral muestra **Muro de gráficos** una sola vez (sección Monitoreo).
