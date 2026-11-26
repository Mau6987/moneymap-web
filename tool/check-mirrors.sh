#!/bin/sh
# Verifica que los archivos espejo sean idénticos en los tres repos.
#
# Los archivos espejo son docs/constitution.md, docs/engineering.md y este mismo
# script. Hay una copia en moneymap-app, una en moneymap-back y una en
# moneymap-web, y tienen que ser iguales (docs/engineering.md, encabezado).
#
# Compara dos cosas:
#
#   1. Los árboles de trabajo. Una diferencia acá es un ERROR y el script sale
#      con código 1: alguien cambió una copia y no las otras.
#
#   2. Lo commiteado en el HEAD de cada repo. Una diferencia acá es un AVISO y
#      el script sigue con código 0: puede ser legítimo mientras se trabaja,
#      pero si es por ramas distintas hay que sincronizarlas antes de integrar.
#      Este aviso es el que faltaba: el árbol de trabajo puede estar sincronizado
#      mientras las ramas ya divergieron.
#
# LÍMITE: mira los tres repos clonados en esta máquina. No ve el remoto ni un
# clon que no tengas al lado. Para eso hace falta CI, que todavía no existe
# (docs/engineering.md §6.9).

set -e

script_dir=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$script_dir/.." && pwd)
parent=$(cd "$root/.." && pwd)

archivos="docs/constitution.md docs/engineering.md tool/check-mirrors.sh"
repos="moneymap-app moneymap-back moneymap-web"

errores=0
avisos=0

for archivo in $archivos; do
  for repo in $repos; do
    otro="$parent/$repo"
    [ -d "$otro" ] || continue
    # Saltar el repo en el que estamos parados.
    [ "$(cd "$otro" && pwd)" = "$root" ] && continue

    # --- 1. Árbol de trabajo ------------------------------------------------
    if [ ! -f "$otro/$archivo" ]; then
      echo "ERROR: falta $repo/$archivo"
      errores=1
      continue
    fi

    if ! diff -q "$root/$archivo" "$otro/$archivo" >/dev/null 2>&1; then
      echo "ERROR: $archivo difiere de $repo (árbol de trabajo)"
      errores=1
    fi

    # --- 2. Lo commiteado en HEAD -------------------------------------------
    rama_otro=$(git -C "$otro" branch --show-current 2>/dev/null)
    [ -n "$rama_otro" ] || continue

    tmp_raiz=$(mktemp)
    tmp_otro=$(mktemp)

    if git -C "$root" show "HEAD:$archivo" >"$tmp_raiz" 2>/dev/null &&
       git -C "$otro" show "HEAD:$archivo" >"$tmp_otro" 2>/dev/null; then
      if ! diff -q "$tmp_raiz" "$tmp_otro" >/dev/null 2>&1; then
        echo "AVISO: $archivo está commiteado distinto en $repo (rama $rama_otro)"
        avisos=1
      fi
    fi

    rm -f "$tmp_raiz" "$tmp_otro"
  done
done

if [ "$errores" -eq 0 ]; then
  echo "árboles de trabajo sincronizados"
fi

if [ "$avisos" -ne 0 ]; then
  echo "revisá los avisos: puede haber ramas con los espejos divergentes."
fi

exit "$errores"
