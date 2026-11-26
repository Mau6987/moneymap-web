# MoneyMap Web

Cliente web de MoneyMap: **Next.js + TypeScript**.

Es un proyecto aparte de `moneymap-app` (Flutter, iOS y Android) y de `moneymap-back` (FastAPI).
No comparte código con ninguno de los dos: comparte el **contrato de la API** (`openapi.json`) y los
**mockups** como fuente de verdad de la forma.

La decisión y sus razones están en [`docs/adr/001-cliente-web-nextjs.md`](docs/adr/001-cliente-web-nextjs.md).

## Antes de tocar código

Lee, en este orden:

1. [`docs/constitution.md`](docs/constitution.md) — qué es innegociable.
2. [`docs/engineering.md`](docs/engineering.md) — cómo se trabaja el código.
3. [`AGENTS.md`](AGENTS.md) — cómo se corre y se toca este repositorio.

## Comandos

```bash
pnpm install
pnpm dev             # desarrollo en http://localhost:3000
pnpm build           # compilación de producción
pnpm lint
pnpm format:check
pnpm test
```

Con Docker en http://localhost:3000 (antes, levanta el back con su `docker compose up -d --build`):

```bash
docker compose up -d --build             # contra la API del back en localhost:8000
DEMO=true docker compose up -d --build   # datos falsos, sin backend
```

## Hooks locales

Una sola vez por clon:

```bash
git config core.hooksPath .githooks
```

Se saltean con `git commit --no-verify` y `git push --no-verify`. No son un candado: el candado es
el CI.
