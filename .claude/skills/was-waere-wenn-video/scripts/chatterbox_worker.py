"""Chatterbox-Worker (läuft in .venv-chatterbox). Erzeugt alle Kandidaten eines Jobs parallel.

Aufruf: <venv-python> chatterbox_worker.py job.json [prozesse]
job.json: {"ref": "...wav", "items": [{"text": "...", "ex": 0.85, "cfg": 0.3, "seed": 1, "out": "...wav"}, ...]}

Tempo: Das Modell wird einmal geladen und die Stimmvorlage einmal ausgewertet. Danach verteilt fork() die
Segmente auf mehrere Prozesse mit je einem Thread. Die Gewichte teilen sich die Prozesse (copy-on-write).
Ein Prozess mit 4 Threads lastet die Kerne beim schrittweisen Generieren kaum aus, 4 Prozesse mit je
1 Thread schon. Das Ergebnis pro Seed ist dasselbe Modell mit derselben Vorlage, die Qualität bleibt gleich.
"""
import json, multiprocessing as mp, os, sys, time

import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

MODEL = None


THREADS = 1


def init():
    torch.set_num_threads(THREADS)


def synth(it):
    t0 = time.time()
    torch.manual_seed(it["seed"])
    wav = MODEL.generate(it["text"], language_id="de", exaggeration=it["ex"], cfg_weight=it["cfg"])
    tmp = it["out"] + ".tmp.wav"
    torchaudio.save(tmp, wav, MODEL.sr)
    os.replace(tmp, it["out"])
    return it["text"], time.time() - t0


def main():
    global MODEL
    job = json.load(open(sys.argv[1], encoding="utf-8"))
    todo = [it for it in job["items"] if not os.path.exists(it["out"])]
    if not todo:
        return
    global THREADS
    procs = int(sys.argv[2]) if len(sys.argv) > 2 else min(len(todo), os.cpu_count() or 1)
    # Eine einzelne Aufnahme rechnet mit allen Kernen. Mehrere laufen per fork mit je 1 Thread:
    # fork + mehrere OpenMP-Threads pro Kind blockiert (gemessen: Kinder hingen bei 0 % CPU).
    THREADS = (os.cpu_count() or 1) if procs <= 1 else 1
    t0 = time.time()
    MODEL = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    MODEL.prepare_conditionals(job["ref"], exaggeration=todo[0]["ex"])
    print(f"Modell bereit in {time.time() - t0:.0f} s, {len(todo)} Segmente auf {procs} Prozessen à {THREADS} Threads", flush=True)
    todo.sort(key=lambda it: -len(it["text"]))  # lange zuerst, damit am Ende kein Prozess allein rechnet
    if procs <= 1:
        init()
        results = map(synth, todo)
    else:
        pool = mp.get_context("fork").Pool(procs, initializer=init)
        results = pool.imap_unordered(synth, todo)
    for i, (text, dt) in enumerate(results):
        print(f"[{i + 1}/{len(todo)}] {dt:4.0f} s  {text[:60]}", flush=True)
    print(f"fertig nach {time.time() - t0:.0f} s", flush=True)


if __name__ == "__main__":
    main()
