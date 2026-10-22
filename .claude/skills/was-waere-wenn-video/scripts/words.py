"""Wortzeitstempel des Voiceovers ausgeben (für Cues und Schnitte).

Aufruf: python3 -I words.py <video-ordner> [modell]   (Standard-Modell: medium)
Ausgabe: eine Zeile pro Satz, "wort@sekunden" – und <video-ordner>/words.json
"""
import json, os, subprocess, sys

import numpy as np
from faster_whisper import WhisperModel

video_dir = sys.argv[1]
model_name = sys.argv[2] if len(sys.argv) > 2 else "medium"
wav = os.path.join(video_dir, "assets", "audio", "voiceover.wav")
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                     stdin=subprocess.DEVNULL, capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel(model_name, device="cpu", compute_type="int8").transcribe(audio, language="de", word_timestamps=True, condition_on_previous_text=False)  # sonst lässt Whisper bei langen Aufnahmen einzelne Wörter aus
words = []
for s in segs:
    print(" ".join(f"{w.word.strip()}@{w.start:.2f}" for w in s.words))
    words += [{"w": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)} for w in s.words]
json.dump(words, open(os.path.join(video_dir, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
