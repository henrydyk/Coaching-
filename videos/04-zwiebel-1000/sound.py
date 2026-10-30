"""ASMR-Sound für „Zwiebel, 1.000 Schnitte“ aus rounds.json: jeder Schnitt ein Hack aufs Brett mit
knackender Zwiebel (wandert im Stereobild mit dem Messer von links nach rechts), fallende Stücke als
leise Klopfer, feines Rieseln beim Haufen, leises Raumrauschen. Keine Musik, keine Stimme.

Aufruf (im Videoordner): python3 -I sound.py  ->  assets/audio/sound.wav (48 kHz, Stereo, ca. -16 LUFS)
"""
import json, subprocess

import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(1000)
plan = json.load(open("rounds.json"))
N_SAMP = int(plan["duration"] * SR) + SR
L, Rch = np.zeros(N_SAMP), np.zeros(N_SAMP)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, btype="low", fs=SR, output="sos"), x)


def place(x, t, gain_db, pan):
    i = int(t * SR)
    if i >= N_SAMP:
        return
    x = x[: N_SAMP - i] * 10 ** (gain_db / 20)
    a = (pan + 1) / 2 * np.pi / 2  # konstante Leistung
    L[i:i + len(x)] += x * np.cos(a)
    Rch[i:i + len(x)] += x * np.sin(a)


# Bausteine (vorab erzeugt, pro Ereignis leicht variiert)
def chop(var):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = 190 + 50 * var
    body = np.sin(2 * np.pi * f * t) * np.exp(-t * 70)                       # Messer trifft Holz
    click = bp(RNG.standard_normal(n), 2500, 7000) * np.exp(-t * 260) * 0.8  # Schneide
    crunch = bp(RNG.standard_normal(n), 1400, 6000) * np.exp(-t * 55) * (0.5 + 0.4 * RNG.random())  # Zwiebel knackt
    x = body * 0.9 + click + crunch
    return x / (np.max(np.abs(x)) + 1e-9)


CHOPS = [chop(v) for v in np.linspace(-1, 1, 12)]


def tap():  # fallendes Stück auf dem Brett
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (500 + 400 * RNG.random()) * t) * np.exp(-t * 180) + bp(RNG.standard_normal(n), 2000, 6000) * np.exp(-t * 300) * 0.5
    return x / (np.max(np.abs(x)) + 1e-9)


TAPS = [tap() for _ in range(16)]


def rustle(dur):  # feines Rieseln (viele winzige Würfel)
    n = int(dur * SR)
    x = bp(RNG.standard_normal(n), 1800, 9000) * (0.6 + 0.4 * RNG.random(n))
    env = np.minimum(1, np.arange(n) / (0.05 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.12 * SR))
    return x * env / (np.max(np.abs(x)) + 1e-9)


def thud():  # neue Zwiebel wird hingelegt
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (95 + 20 * RNG.random()) * t) * np.exp(-t * 28) + lp(RNG.standard_normal(n), 900) * np.exp(-t * 45) * 0.5
    return x / (np.max(np.abs(x)) + 1e-9)


for rd in plan["rounds"]:
    n, c0, c1 = rd["n"], rd["cut0"], rd["cut1"]
    if c0 > rd["t0"]:
        place(thud(), rd["t0"] + 0.02, -12, 0.0)
    rate = n / (c1 - c0)
    g = -4 - 10 * np.log10(max(1.0, rate / 6))  # bei sehr schnellen Schnitten leiser pro Hieb, Summe bleibt ähnlich
    k = (n // 3 + 1)
    for i in range(n):
        u = (i + 0.5) / n
        t = c0 + u * (c1 - c0) + RNG.normal(0, 0.004)
        place(CHOPS[RNG.integers(len(CHOPS))], t, g + RNG.normal(0, 1.2), -0.45 + 0.9 * u)
    if k <= 18:  # grobe Würfel: einzelne Klopfer beim Fallen
        m = min(260, int(k * k * 0.8))
        for _ in range(m):
            u = RNG.random()
            place(TAPS[RNG.integers(len(TAPS))], c0 + u * (c1 - c0) + 0.12 + RNG.random() * 0.25, -22 - 6 * RNG.random(), -0.5 + u)
    else:  # feiner Haufen: Rieseln während des Schnitts, leiser Nachklang
        place(rustle(c1 - c0 + 0.35), c0 + 0.05, -20, 0.0)
    if rd["final"]:
        place(rustle(1.6), c1, -24, 0.0)

# leises Raumrauschen gegen digitale Stille
room = lp(RNG.standard_normal(N_SAMP), 3000) * 10 ** (-52 / 20)
L += room
Rch += room * 0.9
out = np.stack([L, Rch], axis=1)[: int(plan["duration"] * SR)]
out = out / (np.max(np.abs(out)) + 1e-9) * 0.7
raw = "assets/audio/sound-raw.wav"
import wave
with wave.open(raw, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "assets/audio/sound.wav"], check=True)
print("assets/audio/sound.wav geschrieben")
