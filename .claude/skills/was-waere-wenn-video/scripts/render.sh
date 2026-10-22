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
# Lautheit auf -14 LUFS angleichen (nur Tonspur neu, Bild bleibt) und Index an den Dateianfang
# (faststart): Ohne faststart spielen manche Handy-Player und App-Vorschauen den Ton nicht ab.
I=$(ffmpeg -nostdin -hide_banner -nostats -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14 - ($I), 2))")
TMP="${OUT%.mp4}.tmp.mp4"
ffmpeg -nostdin -v error -y -i "$OUT" -c:v copy -af "volume=${G}dB,alimiter=limit=0.8:level=disabled" \
  -c:a aac -b:a 192k -ac 2 -ar 48000 -movflags +faststart "$TMP" && mv "$TMP" "$OUT"
echo "Lautheit (Ziel -14 LUFS, Peak unter -1 dBFS):"
ffmpeg -nostdin -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I|Peak):' | tail -2
echo "$OUT"
