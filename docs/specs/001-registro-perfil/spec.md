# Spec 001 — Registro con correo (web)

## Contexto y objetivo

Quien no tiene cuenta tiene que poder crearla desde el navegador en menos de un minuto, con el mismo flujo que la app: primero se verifica el correo con un link y después se completan los datos. Es la versión web de la spec 001 de la app. La forma sale de los mockups **W03 a W03i** (canvas "MoneyMap · Liquid Glass", página Web). La API es la de la spec 001 del backend, RF-22 a RF-26.

## Usuarios / actores

- Persona sin cuenta.
- La API, que envía el link al correo.

## Requisitos funcionales (EARS)

- ✅ RF-2: CUANDO el usuario abre "Crear cuenta", EL SISTEMA pide solo el correo ("Primero verificamos tu correo", W03) y, con "Enviar link", pide a la API que lo envíe.
- ✅ RF-2a: SI el correo está incompleto, ENTONCES EL SISTEMA muestra "Revisa el correo, falta algo" y mantiene deshabilitado "Enviar link" (W03b).
- ✅ RF-2b: CUANDO la API envía el link, EL SISTEMA muestra "Revisa tu correo" con el correo, los minutos que le quedan al link, "Ya verifiqué · Continuar", "Reenviar link" y "Cambiar correo" (W03d).
- ✅ RF-2c: CUANDO el usuario elige "Reenviar link", EL SISTEMA pide un link nuevo, avisa "Link reenviado" y deshabilita el botón con la cuenta regresiva ("Reenviar en 0:59") hasta la hora que da la API (W03e).
- ✅ RF-2d: CUANDO el usuario elige "Ya verifiqué" y la API responde `pending`, EL SISTEMA muestra "Aún no lo vemos" (W03f); SI responde `expired`, ENTONCES muestra "El link expiró" con "Enviar nuevo link" (W03g). Al volver a la pestaña después de abrir el link, pregunta sola y solo avanza si cambió algo.
- ✅ RF-2e: CUANDO la API responde `verified`, EL SISTEMA muestra "Correo verificado" con "Continuar" (W03h).
- ✅ RF-2f: CUANDO el usuario continúa, EL SISTEMA muestra "Tus datos" con el correo verificado, nombre, apellido, contraseña con su fuerza en cuatro niveles, confirmar contraseña y "Acepto los Términos y la Privacidad" (W03i).
- ✅ RF-3: MIENTRAS falte un campo, la contraseña tenga menos de 8 caracteres, las contraseñas no coincidan o falte aceptar los términos, EL SISTEMA mantiene deshabilitado "Crear cuenta" e indica qué falta junto al campo.
- ✅ RF-5: CUANDO el registro responde 201, EL SISTEMA guarda los tokens en cookies `httpOnly` (spec 008, RF-4) y abre la app, que sigue con el onboarding.
- ✅ RF-6: SI la API responde `email_taken` al pedir el link o al registrarse, ENTONCES EL SISTEMA muestra "Este correo ya tiene una cuenta" con "Entrar", que abre el inicio de sesión con ese correo, y "¿Olvidaste tu contraseña?" (W03c, sin el nombre de la cuenta).

## Requisitos no funcionales

- Seguridad: el id de la verificación va en una cookie `httpOnly` (`mm_verification`, 30 minutos), no en la URL ni en la página: con él se completa el registro.
- Autocompletado: `email`, `given-name`, `family-name` y `new-password`.
- Accesibilidad: etiquetas enlazadas, errores con `role="alert"`, la fuerza de la contraseña como imagen con su texto ("Contraseña segura, 3 de 4") y el aviso de reenvío con `role="status"`.
- Idioma: textos en español (es-BO) desde `src/lib/i18n/register-messages.ts`.

## Modo demo

Con `DEMO=true`: `ocupado@demo.com` da `email_taken`, `sinred@demo.com` da "Sin conexión", `pendiente@demo.com` nunca se verifica, `expirado@demo.com` vence y cualquier otro queda verificado al preguntar.

## Casos límite

- Doble clic en "Enviar link" o "Crear cuenta": el botón se deshabilita mientras espera.
- La verificación vence mientras llena "Tus datos": vuelve a "El link expiró".
- La cookie de la verificación ya no está (otra pestaña o pasaron 30 minutos): vuelve al correo con "Vuelve a verificar tu correo".
- Sin conexión: "Sin conexión" y lo escrito se conserva.
- Nombres con espacios de más: se limpian al enviar (" Ana María " → "Ana María").

## Fuera de alcance

- Google y Apple en el registro (MM-127).
- La ruta del link de verificación: el link del correo lo atiende la API (`GET /v1/auth/verify-email`), que responde HTML.
- El onboarding (spec 007, MM-128).

## Criterios de finalización

- Cada RF con al menos un test en verde.
- Demostración manual en modo demo: correo ocupado, verificación y "Tus datos" hasta el Map.

## Estado de implementación (MM-82)

MM-82 llega en cuatro PR apilados: acciones, paso del correo, verificación y "Tus datos".

- Parte 1, acciones: el acceso a la API del registro (`registration-gateway.ts`, con su demo), la cookie `mm_verification` y las server actions `requestLink`, `resendLink` y `checkLink`. Suma las reglas del formulario (`register-validation.ts`), con la misma fuerza de contraseña que la app: un punto por 8 caracteres, por 12, por dos tipos de carácter y por tres. Todavía no hay pantalla.
- Parte 2, paso del correo: `/register` con "Crear cuenta" (RF-2), el aviso de correo incompleto (RF-2a) y el correo ya registrado con "Entrar" y "¿Olvidaste tu contraseña?" (RF-6). Al enviar el link, por ahora solo dice "Revisa tu correo".
- Parte 3, verificación: "Revisa tu correo" y sus estados (RF-2b a RF-2e), con la cuenta regresiva de la hora que da la API y la consulta sola al volver a la pestaña. Decisión: al enviar el link, "Reenviar link" arranca deshabilitado con la cuenta regresiva. El mockup W03d lo muestra habilitado, pero la API no deja reenviar antes de un minuto (`resend_available_at`).
- Parte 4, "Tus datos": nombre, apellido, contraseña con su fuerza, confirmación y términos (RF-2f y RF-3), y `createAccount`, que registra, guarda la sesión en las cookies y abre la app (RF-5). Si la verificación vence mientras llena el formulario, vuelve a "El link expiró".
- Probado a mano en modo demo con Edge (puppeteer): `ocupado@demo.com` muestra "Este correo ya tiene una cuenta" con "Entrar"; `ana@demo.com` pasa por "Revisa tu correo", "Correo verificado" y "Tus datos" y abre `/map` con las cookies `httpOnly` y sin la de la verificación.
- [NECESITA ACLARACIÓN] "Términos" y "Privacidad" van como texto: todavía no hay páginas a las que enlazar.
