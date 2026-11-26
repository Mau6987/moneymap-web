# Constitución de MoneyMap

Principios que no cambian de una spec a otra. Valen igual para el backend, la app y la web. Si una spec o un pedido los contradice, se pregunta antes de escribir código.

Fuente de producto: PRD MoneyMap V1 (versión 1.4). Fuente de datos: `db/` (migraciones, pruebas y diccionarios).

## 1. Los datos son personales

- Cada dato financiero pertenece a un solo usuario y solo él lo ve. No hay cuentas compartidas, espacios ni roles entre usuarios.
- La base de datos lo impone con Row-Level Security. La API nunca desactiva la RLS ni usa el rol del worker para atender a un usuario.

## 2. El dinero es exacto y tiene una sola moneda por cuenta

- Los montos son decimales exactos: `numeric(19,4)` en la base, `Decimal` en Python y `Decimal` (paquete `decimal`) en Dart. Nunca `float` ni `double`.
- En JSON los montos viajan como texto ("69.60"), no como número.
- Cada cuenta tiene una moneda y todo lo que pasa en ella queda en esa moneda. MoneyMap no tiene tipos de cambio ni convierte monedas: solo se transfiere entre cuentas de la misma moneda.
- Ningún total suma monedas distintas. Saldos, Safe to Spend, Money Flow, Money Story y Can I Afford It? se calculan y se muestran por moneda; la moneda principal va primero.
- Solo hay dos métodos de pago: efectivo y tarjeta. Los bancos son texto libre.

## 3. La base de datos cuida las reglas del dinero

- Saldos de cuentas y de metas los mantienen triggers. Ni la API ni la app los escriben.
- Las claves foráneas compuestas impiden usar datos de otro usuario o mezclar monedas aunque el código tenga un error.
- La API no duplica esas validaciones: las deja actuar y traduce el error a una respuesta clara.

## 4. Lo que cambia con el negocio es dato, no código

Planes, precios, límites por plan, monedas activas, métodos de pago y el orden de proveedores de IA viven en tablas. Cambiarlos no exige desplegar ni publicar una versión de la app.

## 5. Seguridad y privacidad desde el inicio

- Contraseñas con argon2id; tokens de acceso cortos y refresh rotativo; secretos en Secret Manager.
- La app no guarda datos biométricos: usa la validación del sistema operativo.
- Al LLM solo van la frase del usuario y los nombres de sus categorías, cuentas y monedas; nunca saldos ni historial. El audio no se guarda salvo que el usuario lo acepte.
- Ningún log guarda contraseñas, tokens, números de tarjeta (solo los últimos 4) ni fechas de nacimiento.

## 6. Primero la spec, después el código

- Ninguna funcionalidad se programa sin una spec en `docs/specs/NNN-nombre/spec.md`.
- Cada requisito funcional (EARS) tiene al menos un test automático. Una spec está terminada cuando sus criterios de finalización se cumplen.
- Si algo no está claro, se marca `[NECESITA ACLARACIÓN]` en la spec y se pregunta; no se adivina.

## 7. Alcance de la V1

Entra lo que define el PRD 1.5: lo que el equipo marcó en verde en la matriz de funcionalidades, las notificaciones push (FTR-023) y las ampliadas para esta versión, entre ellas presupuestos y Spending Pace (FTR-014 y FTR-015) y What If? (FTR-011). Quedan fuera, entre otros: guardar escenarios de What If?, cuentas bancarias, billeteras y QR, cuentas compartidas, temas personalizados y tipos de cambio.

## 8. Calidad visible

- Quick Add registra un gasto en menos de 10 segundos.
- La API responde en menos de 300 ms (p95) en las operaciones del día a día.
- La app es accesible: textos escalables, contraste suficiente y etiquetas para lectores de pantalla.
- Safe to Spend y Can I Afford It? se presentan como estimaciones con sus supuestos, nunca como consejo financiero.

## 9. Idioma

- Código, nombres de tablas, columnas y endpoints: en inglés. El `<scope>` de un commit también, porque es el nombre de la carpeta del código.
- Mensajes de commit, textos para el usuario, specs y documentación: en español (es-BO). El tipo del commit (`feat`, `fix`, `chore`) queda en inglés porque lo parsean las herramientas de changelog.

## 10. Cómo se trabaja el código

El detalle está en `docs/engineering.md`. Estas cinco no se negocian:

- Ninguna rama llega a `develop` ni a `main` sin pasar por un pull request.
- Ningún PR se mergea con tests en rojo. Un test omitido o comentado cuenta como rojo.
- Ningún PR sin spec: si el código contradice la spec, se para y se pregunta.
- Ningún PR toca RLS, migraciones, autenticación o el cálculo de saldos sin una segunda revisión.
- Un archivo no pasa de 300 líneas ni una función de 40: si pasa, se parte antes de seguir.
