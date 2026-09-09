#!/usr/bin/env bash
# Marca la build nei sorgenti serviti.
#
# GitHub Pages tiene i file in cache dieci minuti e non permette di
# cambiare gli header, quindi l'unico modo per essere sicuri che un
# telefono prenda la versione nuova è cambiare l'indirizzo dei file:
# index.html chiede i sorgenti con `?v=<marca>` in coda.
#
# uso: tools/stamp.sh [marca]
#   senza argomenti usa la data e l'ora UTC, che basta a distinguere due
#   pubblicazioni; in CI si passa i primi 7 caratteri del commit.
set -euo pipefail
cd "$(dirname "$0")/.."

V="${1:-$(date -u +%y%m%d-%H%M)}"

# solo caratteri innocui: la marca finisce in una query e nell'interfaccia
case "$V" in
  *[!A-Za-z0-9._-]*) echo "marca non valida: $V" >&2; exit 1 ;;
esac

perl -0pi -e "s/window\.BUILD = '[^']*'/window.BUILD = '$V'/" web/index.html
grep -o "window\.BUILD = '[^']*'" web/index.html
