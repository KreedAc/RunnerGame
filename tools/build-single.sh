#!/usr/bin/env bash
# Costruisce una versione a file singolo del gioco (three.js + sorgenti inline).
# Serve per pubblicare/condividere una demo che si apre senza web server.
set -euo pipefail
cd "$(dirname "$0")/.."
# Prima si marca la build: la marca finisce nella query dei <script> di
# web/index.html e nell'angolo del menu, e cambia ad ogni costruzione.
# In CI si passa il commit con BUILD_MARK.
"$(dirname "$0")/stamp.sh" ${BUILD_MARK:+"$BUILD_MARK"} > /dev/null

mkdir -p dist
OUT=dist/torre-di-ghiaccio.html

# stesso ordine di caricamento di index.html
SRC="web/src/i18n.js web/src/core.js web/src/art.js web/src/world.js web/src/actors.js web/src/hub.js web/src/game.js"

# tutto tranne il loader: markup, CSS e i div dell'interfaccia
sed '/<script src="vendor\/three.min.js">/,$d' web/index.html > "$OUT"

{
  echo '<script>'; cat web/vendor/three.min.js; echo; echo '</script>'
  echo '<script>'
  for f in $SRC; do echo "/* ---- $f ---- */"; cat "$f"; echo; done
  echo '</script>'
} >> "$OUT"

echo "$OUT ($(du -h "$OUT" | cut -f1))"
