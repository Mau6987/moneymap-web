# Spec 008 — Inicio de sesión y sesión (web)

## Contexto y objetivo

Quien ya tiene cuenta tiene que poder entrar a MoneyMap desde el navegador con la misma cuenta que usa en el teléfono. La sesión se mantiene sola y, si se pierde, la web vuelve al inicio de sesión sin dejar datos a la vista. Es la versión web de la spec 008 de la app: mismo número, misma funcionalidad. La forma sale del mockup **W02 · Login** (canvas "MoneyMap · Liquid Glass", página Web). La API es la de la spec 001 del backend.

A diferencia de la app, **los tokens viven en cookies `httpOnly`** que escribe el servidor de Next.js: el JavaScript del navegador nunca los ve (ADR-001).

## Usuarios / actores

- Persona registrada sin sesión en este navegador.
- Persona con sesión que vuelve a abrir la web.

## Requisitos funcionales (EARS)

### Inicio de sesión con correo

- ✅ RF-1: CUANDO alguien abre cualquier página de la app sin sesión, EL SISTEMA abre el inicio de sesión: la pantalla partida de W02, con "Your money. Mapped.", los tres puntos de la promesa, "Entrar", el correo, la contraseña con "¿La olvidaste?", el botón "Entrar" y "¿Nuevo aquí? Crear cuenta".
- ✅ RF-2: CUANDO la pantalla se abre con un correo (`/login?email=`), EL SISTEMA lo muestra escrito y pone el foco en la contraseña.
- ✅ RF-3: MIENTRAS el correo no tenga formato válido o la contraseña esté vacía, EL SISTEMA mantiene deshabilitado "Entrar".
- ✅ RF-4: CUANDO el inicio de sesión responde 200, EL SISTEMA guarda los tokens en cookies `httpOnly` (`SameSite=Lax`, `Secure` fuera de local) y abre el Map.
- ✅ RF-5: SI la API responde `invalid_credentials`, ENTONCES EL SISTEMA muestra "Correo o contraseña incorrectos", vacía la contraseña y conserva el correo.
- ✅ RF-6: SI la API responde `too_many_requests`, ENTONCES EL SISTEMA muestra "Demasiados intentos. Espera un momento e intenta de nuevo".
- ✅ RF-7: CUANDO el usuario elige "Crear cuenta", EL SISTEMA abre el registro (spec 001).
- ✅ RF-8 a RF-11 con Google (MM-127): el botón de Google Identity Services da el `id_token`, una server action lo manda a `POST /v1/auth/oauth/google` y guarda la sesión en las cookies; si la persona es nueva, "Completa tu perfil" (`/register/google`) cierra con `POST /v1/auth/oauth/complete`. El token de registro va en una cookie `httpOnly`. Cerrar la ventana de Google no muestra error.
- Configuración: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` es el Client ID de tipo Web, el mismo `GOOGLE_CLIENT_ID` del back, con la URL de la web como origen autorizado. Sin él, Google no aparece. En el modo demo, "Continuar con Google" simula a Google: la primera vez pide completar el perfil y después entra.
- Pendiente: Apple (MM-150) y RF-12 (Google en "Crear cuenta"), igual que en la app.

### Sesión

- ✅ RF-19: CUANDO el token de acceso venció y queda el refresh, EL SISTEMA pide un par nuevo una sola vez aunque el navegador mande varias peticiones juntas, lo guarda y sigue sin interrumpir al usuario. Lo hace el middleware, antes de armar la página.
- ✅ RF-20: SI la renovación falla, o la API responde 401 mientras se arma una página, ENTONCES EL SISTEMA borra las cookies y abre el inicio de sesión con "Tu sesión terminó. Inicia sesión de nuevo". Sin conexión no se borra nada.
- ✅ RF-21: CUANDO alguien con sesión abre una página de acceso (inicio de sesión, registro, recuperar contraseña), EL SISTEMA lo lleva al Map.

### Cierre de sesión

- ✅ RF-22: CUANDO el usuario elige "Cerrar sesión" en Ajustes, EL SISTEMA pide confirmar con "¿Cerrar sesión?".
- ✅ RF-23: CUANDO confirma, EL SISTEMA llama a `POST /v1/auth/logout` con el refresh y, responda lo que responda (también sin conexión), borra las cookies y abre el inicio de sesión.

## Requisitos no funcionales

- Seguridad: los tokens nunca llegan al JavaScript del navegador, ni en el HTML, ni en `localStorage`, ni en logs.
- Autocompletado del navegador: `autocomplete="email"` y `current-password`.
- Accesibilidad: etiquetas enlazadas, errores con `role="alert"`, foco visible y diálogo nativo con Esc.
- Idioma: textos en español (es-BO) desde `src/lib/i18n/`.

## Modo demo

Con `DEMO=true` la web usa datos falsos en lugar de la API, igual que la app. La contraseña `incorrecta` da `invalid_credentials`, `sinverificar@demo.com` da `email_not_verified` y `sinred@demo.com` da "Sin conexión". Cualquier otro correo entra como Ana López.

## Casos límite

- Doble clic en "Entrar": el botón se deshabilita mientras espera.
- Sin conexión: "Sin conexión" y el correo se conserva.
- Varias pestañas renuevan a la vez: el middleware recuerda el par nuevo unos segundos (RF-19).
- Web: no hay desbloqueo biométrico; RF-13 a RF-18 de la app no aplican.

## Fuera de alcance

- Recuperar la contraseña (spec 009) y el registro (spec 001).
- Cerrar las otras sesiones: la API no tiene el endpoint.

## Criterios de finalización

- Cada RF con al menos un test en verde.
- Demostración manual en modo demo: entrar, error de credenciales, sesión vencida y cierre de sesión.

## Estado de implementación (MM-13)

MM-13 llega en cuatro PR apilados, para no pasar las 400 líneas: sesión, middleware, inicio de sesión y cierre de sesión.

- Parte 1, sesión: las cookies `httpOnly` (`src/lib/auth/tokens.ts`), la renovación una sola vez por refresh (`refresh.ts`), la decisión de qué ruta pide sesión (`route-guard.ts`), el acceso a la API (`auth-gateway.ts`) y el modo demo. Todavía nada lo usa.
- Parte 2, middleware: `src/middleware.ts` manda al inicio de sesión a quien no tiene sesión (RF-1), renueva antes de armar la página (RF-19), borra la sesión si la renovación falla o la API responde 401 (`/session/expired`, RF-20) y saca de las páginas de acceso a quien ya entró (RF-21). Suma el marco con el menú y el perfil de `GET /v1/me`.
- El Map, por ahora, solo saluda; sus tarjetas llegan con MM-41.
- [NECESITA ACLARACIÓN] El perfil de la API no trae el plan: el pie del menú muestra el correo en lugar de "Plan Gratis".
- Parte 3, inicio de sesión: la pantalla de W02 con el correo, la contraseña y sus errores por `code` (RF-2 a RF-7). Google y Apple llegan con MM-127.
- Parte 4, cierre de sesión: "Cerrar sesión" en Ajustes, con confirmación (RF-22 y RF-23). Ajustes, por ahora, solo tiene eso; el resto llega con MM-136.
- Probado a mano en modo demo con Edge (puppeteer): sin sesión `/map` abre el inicio de sesión; `incorrecta` muestra el error y vacía la contraseña; al entrar quedan `mm_access` y `mm_refresh` como `httpOnly` y `document.cookie` no los ve; con sesión `/login` vuelve al Map; sin `mm_access` el middleware renueva; cerrar sesión borra las dos cookies; `/session/expired` abre el inicio de sesión con el aviso.
