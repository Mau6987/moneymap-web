# AGENTS.md — MoneyMap Web

## Proyecto

Cliente web de MoneyMap: **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4**. Registra gastos e ingresos en segundos y muestra hacia dónde va el dinero (Map, Safe to Spend, Money Flow, metas, Can I Afford It? y Money Story).

Es un proyecto aparte de `moneymap-app` (Flutter, iOS y Android) y de `moneymap-back` (FastAPI). **No comparte código con ninguno**: comparte el contrato de la API (`openapi.json`) y los mockups como fuente de verdad de la forma.

El cliente web solo habla con la API de MoneyMap; nunca con la base de datos ni con proveedores de IA. Las llamadas salen del **servidor** (route handlers y data fetching de React Server Components), no del navegador.

```
src/
  app/                       App Router: rutas, layouts, loading y error
  components/                componentes de UI, sin lógica de negocio
  features/<funcionalidad>/  una carpeta por funcionalidad
  lib/
    api/                     cliente generado desde openapi.json (no se edita a mano)
    auth/                    sesión y cookies httpOnly
    i18n/                    textos visibles, en español (es-BO)
    money/                   montos exactos y formato es-BO
docs/adr/                    decisiones que no se revierten fácil
docs/constitution.md         los principios. Espejo con los otros dos repos
docs/engineering.md          cómo se trabaja el código. Espejo con los otros dos repos
.githooks/                   hooks locales
```

## Comandos

- Ejecutar: `pnpm dev` · sin backend, con datos falsos: `DEMO=true pnpm dev` · en Docker: `docker compose up -d --build` (contra el back; `DEMO=true` sin él)
- Tests: `pnpm test` · en modo vigilancia: `pnpm test:watch`
- Lint/formato: `pnpm lint` y `pnpm format:check`
- Tipos: `pnpm typecheck`
- Compilar: `pnpm build`
- Cliente de la API: `pnpm generate:api [ruta/a/openapi.json]` (por defecto `../moneymap-back/openapi.json`)
- Hooks locales (una sola vez por clon): `git config core.hooksPath .githooks`

El gestor de paquetes es **pnpm**, no npm. Está fijado en `packageManager` de `package.json`. El archivo `pnpm-lock.yaml` se versiona; `package-lock.json` no existe y no debe crearse.

## Estilo y convenciones

- TypeScript en modo `strict`, con `noUncheckedIndexedAccess`. Nada de `any` sin justificar en el PR.
- Código e identificadores en inglés; todo texto visible en español (es-BO), desde `src/lib/i18n/`. Nunca escrito dentro de un componente.
- Archivos y carpetas en `kebab-case`; componentes en `PascalCase`.
- **Montos siempre con `decimal.js`.** Nunca `number` para dinero. Los montos llegan de la API como texto y se formatean con `src/lib/money/`.
- Errores de la API se muestran según su `code` (`currency_mismatch`, `plan_limit`, `email_taken`…), con textos de `src/lib/i18n/`.
- Un componente no sabe de dónde vienen los datos: los recibe por props o por un hook de su `feature`.

## Reglas

- Lee `docs/constitution.md`, `docs/engineering.md` y la spec activa antes de tocar código.
- **Los tokens de sesión van en cookies `httpOnly`.** El JavaScript del navegador nunca los ve. Prohibido guardarlos en `localStorage`, `sessionStorage` o en memoria del cliente.
- **Nunca**: convertir monedas, mostrar un total que sume monedas distintas, ofrecer un tipo de cambio, usar `number` para dinero, ni calcular saldos en el cliente (los da la API).
- La moneda de un movimiento es la de su cuenta: Quick Add y la voz no muestran selector de moneda; las transferencias solo ofrecen cuentas de la misma moneda.
- Nada de datos financieros en logs, analítica ni captura de errores. Ver `docs/engineering.md` §5.1.
- Modo privado: si está activo, la web abre con todos los montos ocultos.
- No edites a mano el código generado (`src/lib/api/generated/`): regenéralo desde `openapi.json`.
- No agregues paquetes ni cambies el enrutado sin preguntar.
- Lo que está fuera de la V1 (escenarios guardados de What If?, QR, cuentas compartidas, temas personalizados) no se programa.
- Accesibilidad en cada pantalla: HTML semántico, foco visible, navegación con teclado, contraste AA en claro y oscuro, y etiquetas para lectores de pantalla.
- Los mockups definen la forma; las specs, el comportamiento. Si se contradicen, se para y se pregunta.
- Commits con Conventional Commits y scope del módulo (`feat(map): …`), según `docs/engineering.md` §1.2.

## Al terminar cualquier tarea

- Corre `pnpm format:check && pnpm lint && pnpm test && pnpm build` y deja todo en verde.
- Si tocaste un flujo principal (registro, Quick Add, transferencias, Map), verifícalo en el navegador.
- Si cambió el contrato de la API, regenera el cliente y corre sus pruebas.
- Revisa la pantalla en tema claro y oscuro, con texto al 200 % y en una ventana angosta.
- Verifica que `docs/engineering.md` y `docs/constitution.md` sigan idénticos a los de los otros repos: `tool/check-mirrors.sh`.
- Marca en la spec los requisitos cumplidos, anota las dudas nuevas como `[NECESITA ACLARACIÓN]` y resume qué cambió y cómo lo probaste.
