#!/bin/sh
# Regenera los tipos del cliente de la API desde openapi.json.
#
# Uso: tool/generate-api.sh [ruta/a/openapi.json]
# Por defecto toma el contrato del backend clonado al lado, igual que la app.
#
# El resultado (src/lib/api/generated/) no se edita a mano: se regenera
# (docs/engineering.md §1.5.5).

set -e

spec="${1:-../moneymap-back/openapi.json}"

if [ ! -f "$spec" ]; then
  echo "generate-api: no existe $spec"
  exit 1
fi

pnpm exec openapi-typescript "$spec" --output src/lib/api/generated/schema.ts
