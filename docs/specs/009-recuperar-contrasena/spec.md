# Spec 009 — Recuperar la contraseña (web)

## Contexto y objetivo

Quien olvidó la contraseña tiene que poder crear una nueva desde el navegador con un código de 6 dígitos que llega a su correo, igual que en la app. Es la versión web de la spec 009 de la app. La forma sale de los mockups **Web 03f a 03i** (canvas "MoneyMap · Liquid Glass", página Web). La API es la de la spec 008 del backend.

## Requisitos funcionales (EARS)

- ✅ RF-1: CUANDO el usuario elige "¿La olvidaste?" en el inicio de sesión o "¿Olvidaste tu contraseña?" en el registro, EL SISTEMA abre "¿Olvidaste tu contraseña?" con el correo que ya había escrito (`/forgot-password?email=`).
- ✅ RF-2: MIENTRAS el correo no tenga formato válido, EL SISTEMA mantiene deshabilitado "Enviar código"; CUANDO lo elige, EL SISTEMA pide el código y abre "Revisa tu correo" con el correo, "Si tu correo tiene una cuenta, te enviaremos un código de 6 dígitos. Vence en 30 min" y la cuenta regresiva. Nunca dice si el correo tiene cuenta.
- ✅ RF-3: SI la API responde `invalid_reset_code` al verificar o al guardar, ENTONCES EL SISTEMA vuelve a "Revisa tu correo" con "El código no coincide o ya venció. Pídelo de nuevo", el campo vacío y "Verificar código" deshabilitado.
- ✅ RF-4: "Reenviar código" se habilita un minuto después de cada envío, con la cuenta regresiva ("Reenviar en 0:59"), y avisa "Código reenviado".
- ✅ RF-5: "Verificar código" se habilita solo con 6 dígitos y pregunta a la API si el código sirve sin gastarlo; con `204` abre "Crea tu nueva contraseña", con la barra de fuerza de "Tus datos" y la confirmación. "Guardar contraseña" se habilita solo si tiene al menos 8 caracteres y las dos coinciden.
- ✅ RF-6: CUANDO la contraseña se guarda, EL SISTEMA muestra "Contraseña actualizada" con "Iniciar sesión", que abre el inicio de sesión con el correo escrito. La pantalla de la contraseña avisa "Al guardarla, se cerrará tu sesión en los otros dispositivos".
- ✅ RF-7: SI no hay conexión, ENTONCES EL SISTEMA muestra "Sin conexión" y conserva lo escrito.
- ✅ RF-8: SI la API responde `too_many_requests`, ENTONCES EL SISTEMA muestra "Demasiados intentos. Espera un momento e intenta de nuevo".

## Requisitos no funcionales

- Seguridad: el código y la contraseña viven solo en la memoria de la página y viajan a la API desde el servidor (server actions). Nada queda en cookies, URL ni almacenamiento.
- Autocompletado: `email`, `one-time-code` y `new-password`; el código pide teclado numérico.
- Accesibilidad: el tiempo restante tiene etiqueta ("Tiempo restante"), los errores usan `role="alert"` y el reenvío `role="status"`.

## Modo demo

Con `DEMO=true` el código es `123456`, y lo dice debajo del encabezado. Cualquier otro da `invalid_reset_code`, y `sinred@demo.com` da "Sin conexión".

## Fuera de alcance

- `Retry-After` de RF-8 en la app: la web avisa, pero no bloquea el botón por ese tiempo.
- Cambiar la contraseña con la sesión iniciada: va en Ajustes → Seguridad (MM-136) y reutiliza estos pasos.

## Criterios de finalización

- Cada RF con al menos un test en verde.
- Demostración manual en modo demo: código incorrecto, código correcto, contraseña nueva e inicio de sesión.

## Estado de implementación (MM-126)

MM-126 llega en tres PR apilados: acciones, paso del correo y código con contraseña nueva.

- Parte 1, acciones: el acceso a la API (`password-reset-gateway.ts`, con su demo) y las server actions `requestResetCode`, `verifyResetCode` y `confirmPasswordReset`. Suma piezas que comparten el registro y la recuperación: `Toast`, `StepHeader` y `PasswordStrengthBar`.
- Parte 2, paso del correo: `/forgot-password` con "¿Olvidaste tu contraseña?" y el correo que ya venía escrito, también desde "¿La olvidaste?" del inicio de sesión (RF-1); sin conexión conserva el correo (RF-7). Al enviar, por ahora solo dice "Revisa tu correo".
- Parte 3, código: "Revisa tu correo" con la cuenta regresiva de 30 minutos, el código de 6 dígitos, el reenvío al minuto y los errores (RF-2 a RF-4 y RF-8). Con un código válido, por ahora solo dice "Crea tu nueva contraseña".
- Parte 4, contraseña nueva: "Crea tu nueva contraseña" con la barra de fuerza y la confirmación (RF-5), y "Contraseña actualizada" con "Iniciar sesión" y el correo escrito (RF-6). Si la API rechaza el código al guardar, vuelve al código con el aviso (RF-3). `NewPasswordStep` queda listo para reutilizarlo en Ajustes → Seguridad.
- Probado a mano en modo demo con Edge (puppeteer): desde el inicio de sesión con `ana@demo.com`, `999999` muestra "El código no coincide o ya venció. Pídelo de nuevo"; `123456` abre la contraseña nueva; al guardar, "Iniciar sesión" abre `/login?email=ana%40demo.com`.
