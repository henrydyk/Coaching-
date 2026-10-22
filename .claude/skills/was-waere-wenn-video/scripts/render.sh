#!/usr/bin/env bash
# Prüfen + Rendern:  bash render.sh <video-ordner> [ausgabe.mp4]
set -euo pipefail
DIR="$(cd "${1:?Videoordner fehlt}" && pwd)"
OUT="${2:-$DIR/renders/$(basename "$DIR" | sed 's/^[0-9]*-//').mp4}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac # absolut machen, bevor wir in den Videoordner wechseln
if [ -z "${HYPERFRAMES_BROWSER_PATH:-}" ]; then
  for p in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do
    [ -x "$p" ] && export HYPERFRAMES_BROWSER_PATH="$p"
  done
fi
cd "$DIR"
npx hyperframes check
mkdir -p "$(dirname "$OUT")"
npx hyperframes render --output "$OUT" --fps 30 --workers "${HF_WORKERS:-1}" # mehr Worker bringen hier nichts: Software-WebGL lastet alle Kerne schon aus
echo "Lautheit (Ziel ca. -14 LUFS):"
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):' | tail -2
echo "$OUT"
