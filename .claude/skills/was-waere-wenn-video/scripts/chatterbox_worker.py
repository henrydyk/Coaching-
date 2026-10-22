"""Chatterbox-Worker (läuft in .venv-chatterbox). Erzeugt alle Kandidaten eines Jobs mit einem Modell-Ladevorgang.

job.json: {"ref": "...wav", "items": [{"text": "...", "ex": 0.85, "cfg": 0.3, "seed": 1, "out": "...wav"}, ...]}
"""
import json, os, sys

import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

job = json.load(open(sys.argv[1], encoding="utf-8"))
todo = [it for it in job["items"] if not os.path.exists(it["out"])]
if todo:
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    for i, it in enumerate(todo):
        torch.manual_seed(it["seed"])
        wav = model.generate(it["text"], language_id="de", audio_prompt_path=job["ref"],
                             exaggeration=it["ex"], cfg_weight=it["cfg"])
        torchaudio.save(it["out"], wav, model.sr)
        print(f"[{i + 1}/{len(todo)}] {it['text'][:60]}", flush=True)
