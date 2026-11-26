# ADR-001 · Cliente web en Next.js

- **Estado:** aceptado
- **Fecha:** 2026-10-15
- **Alcance:** web (`moneymap-web`)
- **Cambia:** nada; es la decisión que crea este repositorio

## Contexto

MoneyMap tiene la app Flutter para iOS y Android y la API en FastAPI. La V1 también incluye una
versión web con la misma cuenta.

`moneymap-app` tenía la carpeta `web/`: el andamio con el que Flutter compila el mismo código Dart
al navegador. La pregunta era si la web salía de ahí o era un cliente aparte.

Lo que decidió:

- La app está diseñada para un teléfono: cinco pestañas y una columna.
- `flutter build web` descarga CanvasKit, entre 1,5 y 2 MB de WebAssembly, antes de pintar nada, y
  renderiza a canvas: el texto no es texto en el DOM.
- La constitución §8 exige accesibilidad —textos escalables, contraste AA y etiquetas para lectores
  de pantalla— y §5, seguridad.
- Los saldos los calcula la API y los montos viajan como texto. Del lado del cliente solo queda
  formatear.
- La web tiene que vender los planes (uno gratuito y tres de pago), así que necesita páginas
  indexables.

## Decisión

El cliente web es un proyecto aparte en **Next.js + TypeScript**, en su propio repositorio. Las
llamadas a la API salen del servidor, y los tokens de sesión viven en cookies `httpOnly`.

## Alternativas descartadas

**Flutter web, reusando `moneymap-app`.** Se descartó por tres razones. Primero, la accesibilidad:
renderizar a canvas deja el DOM casi vacío, que es el punto débil conocido de Flutter en el
navegador, justo lo que la constitución §8 pide cuidar. Segundo, el peso y el arranque: bajar
CanvasKit antes del primer píxel no convive con un presupuesto de rendimiento. Tercero, el ahorro
real es menor de lo que parece: el layout de escritorio —barra lateral, tablas, varias columnas— hay
que construirlo igual, así que se paga el costo de Flutter web y no te ahorras el trabajo de UI.

**Una SPA con Vite.** Es más liviana y se despliega como archivos estáticos, sin runtime de Node. Se
descartó por las cookies: con Next.js los tokens los pone el servidor en cookies `httpOnly` y el
JavaScript del navegador nunca los ve; en una SPA los maneja el cliente y un XSS los puede leer. Con
la constitución §5 exigiendo seguridad, esa diferencia pesa más que la simpleza de Vite. Sigue siendo
la opción razonable si el cliente web fuera solo la app detrás del login y nunca necesitara páginas
públicas.

**Una SPA con Vite más un backend-for-frontend propio.** Logra las cookies, pero agrega un servicio
más para mantener. Es lo que Next.js ya trae.

## Consecuencia

- Se borró `web/` de `moneymap-app`, que pasa a ser solo iOS y Android. Mientras esa carpeta
  existiera, `flutter build web` produciría un sitio que funciona y nadie sabría cuál es el oficial.
- Hay **dos bases de código** para la misma interfaz, con el riesgo de que se desvíen. La mitigación:
  los mockups son la fuente de verdad de la forma para las dos, `openapi.json` es el contrato
  compartido, y `docs/engineering.md` §4.1 obliga a parar y preguntar cuando algo se contradice.
- El segundo cliente obliga a mantener la API pensada para dos consumidores, no solo para Flutter.
- La web queda **fuera de las estimaciones del PRD**: sus 15 días cubren app y backend, y un segundo
  cliente no está en esa cuenta.
