#!/usr/bin/env bash
# Costruisce una versione a file singolo del gioco (three.js + game.js inline).
# Serve per pubblicare/condividere una demo che si apre senza web server.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
OUT=dist/gate-runner.html

# tutto tranne il loader: markup, CSS e <div> dell'interfaccia
sed '/<script src="vendor\/three.min.js">/,$d' web/index.html > "$OUT"

{
  echo '<script>'; cat web/vendor/three.min.js; echo; echo '</script>'
  echo '<script>'; cat web/game.js;           echo; echo '</script>'
} >> "$OUT"

echo "$OUT ($(du -h "$OUT" | cut -f1))"
