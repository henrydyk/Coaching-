#!/usr/bin/env bash
# Einmal pro Container: Chatterbox-TTS (MIT) in eigener venv installieren (CPU).
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
VENV="$ROOT/.venv-chatterbox"
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
  "$VENV/bin/pip" install -q chatterbox-tts
fi
"$VENV/bin/python" -c "from chatterbox.mtl_tts import SUPPORTED_LANGUAGES as L; assert 'de' in L; print('Chatterbox bereit:', '$VENV')"
