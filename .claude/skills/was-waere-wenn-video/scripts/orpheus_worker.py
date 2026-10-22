"""Kartoffel-Orpheus-Worker (läuft in .venv-chatterbox): deutsches Orpheus-3B über llama.cpp + SNAC-Decoder.

Aufruf: <venv-python> orpheus_worker.py job.json
job.json: {"model": "...gguf", "items": [{"text": "...", "voice": "Julian", "seed": 1, "temp": 0.6, "out": "...wav"}, ...]}

Modell: SebastianBodza/Kartoffel_Orpheus-3B_german_natural-v0.1 (Llama-3.2-Lizenz, "Built with Llama"),
trainiert auf natürlicher deutscher Sprache (Podcasts, Vorträge). Prompt-Format laut Modellkarte:
[128259] + BOS + "Sprecher: Text" + [128009, 128260]; die Antwort sind SNAC-Codes (7 pro Frame, 24 kHz).
"""
import json, os, sys, time

import numpy as np
import soundfile as sf
import torch
from llama_cpp import Llama
from snac import SNAC

START, END_TEXT, START_AI, AUDIO_START, AUDIO_END, CODE_OFFSET = 128259, (128009, 128260), None, 128257, 128258, 128266


def codes_to_audio(snac, tokens):
    if AUDIO_START in tokens:
        tokens = tokens[len(tokens) - tokens[::-1].index(AUDIO_START):]
    codes = [t - CODE_OFFSET for t in tokens if t != AUDIO_END and t >= CODE_OFFSET]
    codes = codes[: len(codes) // 7 * 7]
    l1, l2, l3 = [], [], []
    for i in range(len(codes) // 7):
        c = codes[7 * i:7 * i + 7]
        l1.append(c[0])
        l2.append(c[1] - 4096)
        l3 += [c[2] - 2 * 4096, c[3] - 3 * 4096]
        l2.append(c[4] - 4 * 4096)
        l3 += [c[5] - 5 * 4096, c[6] - 6 * 4096]
    layers = [torch.tensor(l).clamp(0, 4095).unsqueeze(0) for l in (l1, l2, l3)]
    with torch.inference_mode():
        return snac.decode(layers).squeeze().numpy()


def main():
    job = json.load(open(sys.argv[1], encoding="utf-8"))
    todo = [it for it in job["items"] if not os.path.exists(it["out"])]
    if not todo:
        return
    t0 = time.time()
    llm = Llama(model_path=job["model"], n_ctx=4096, n_threads=os.cpu_count(), verbose=False)
    snac = SNAC.from_pretrained("hubertsiuzdak/snac_24khz").eval()
    print(f"Modell bereit in {time.time() - t0:.0f} s", flush=True)
    for i, it in enumerate(todo):
        t1 = time.time()
        prompt = llm.tokenize(f"{it['voice']}: {it['text']}".encode(), add_bos=True, special=False)
        ids = [START] + prompt + list(END_TEXT)
        llm.reset()
        llm.set_seed(int(it.get("seed", 1)))
        out = []
        for tok in llm.generate(ids, temp=float(it.get("temp", 0.6)), top_p=0.95, repeat_penalty=1.1):
            if tok == AUDIO_END or len(out) > 3500:
                break
            out.append(tok)
        audio = codes_to_audio(snac, out)
        sf.write(it["out"] + ".tmp.wav", audio, 24000)
        os.replace(it["out"] + ".tmp.wav", it["out"])
        dt = time.time() - t1
        print(f"[{i + 1}/{len(todo)}] {dt:4.0f} s für {len(audio) / 24000:4.1f} s Audio  {it['voice']}: {it['text'][:50]}", flush=True)


if __name__ == "__main__":
    main()
