#!/usr/bin/env bash
# Neues Videoprojekt anlegen:  bash new_video.sh <slug>   ->  videos/NN-<slug>/
set -euo pipefail
SLUG="${1:?Slug fehlt, z. B. keine-regeln}"
ROOT="$(git rev-parse --show-toplevel)"
SKILL="$ROOT/.claude/skills/was-waere-wenn-video"
COUNT=$(find "$ROOT/videos" -maxdepth 1 -type d -name '[0-9][0-9]-*' 2>/dev/null | wc -l)
DIR="$ROOT/videos/$(printf '%02d' $((COUNT + 1)))-$SLUG"
[ -e "$DIR" ] && { echo "Existiert schon: $DIR" >&2; exit 1; }
[ -d "$ROOT/node_modules/hyperframes" ] || (cd "$ROOT" && npm install)
mkdir -p "$DIR"
cp -r "$SKILL/template/." "$DIR/"
mkdir -p "$DIR/assets/vendor" "$DIR/assets/fonts" "$DIR/assets/audio" "$DIR/renders"
NM="$ROOT/node_modules"
cp "$NM/three/build/three.module.min.js" "$NM/three/build/three.core.min.js" "$NM/gsap/dist/gsap.min.js" "$DIR/assets/vendor/"
cp "$NM"/@fontsource/newsreader/files/newsreader-latin-{400,500}-{normal,italic}.woff2 \
   "$NM"/@fontsource/inter/files/inter-latin-{500,600,700}-normal.woff2 "$DIR/assets/fonts/"
echo "$DIR"
