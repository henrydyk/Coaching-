"""Leise italienische Restaurant-Musik (eigene Komposition, lizenzfrei): Walzer im 3/4-Takt mit
Mandoline (Tremolo, zweite Stimme in Terzen), Gitarre (Bass + Akkord, „Um-pa-pa“) und Akkordeon
(Musette, drei leicht verstimmte Zungen). Teil A in C-Dur, Teil B in a-Moll, dann wieder A mit Schluss.
Das Tempo wird so gewählt, dass das Stück genau die gewünschte Länge hat.

Aufruf: python3 -I italian_music.py <dauer_s> <out.wav>   (48 kHz, Stereo, ca. -16 LUFS)
"""
import subprocess, sys, wave

import numpy as np
from scipy import signal

SR = 48000
DUR = float(sys.argv[1])
OUT = sys.argv[2]
RNG = np.random.default_rng(7)

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(n):  # "E5" -> 76
    return NOTE[n[:-1]] + 12 * (int(n[-1]) + 1)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


CHORDS = {"C": ["C", "E", "G"], "G7": ["G", "B", "D", "F"], "C7": ["C", "E", "G", "Bb"], "F": ["F", "A", "C"],
          "Am": ["A", "C", "E"], "E7": ["E", "G#", "B", "D"], "Dm": ["D", "F", "A"]}

# Melodie: pro Takt (Akkord, [(Ton, Schläge), ...]); "-" = Pause
A = [("C", [("G4", 1), ("C5", 1), ("E5", 1)]), ("C", [("G5", 2), ("E5", 1)]),
     ("G7", [("F5", 2), ("D5", 1)]), ("G7", [("B4", 3)]),
     ("G7", [("D5", 1), ("F5", 1), ("A5", 1)]), ("G7", [("G5", 2), ("F5", 1)]),
     ("C", [("E5", 1), ("D5", 1), ("C5", 1)]), ("C", [("E5", 3)]),
     ("C", [("G4", 1), ("C5", 1), ("E5", 1)]), ("C7", [("Bb5", 2), ("G5", 1)]),
     ("F", [("A5", 2), ("F5", 1)]), ("F", [("C5", 3)]),
     ("C", [("E5", 1), ("G5", 1), ("E5", 1)]), ("G7", [("D5", 2), ("B4", 1)]),
     ("C", [("C5", 3)]), ("C", [("C5", 2), ("-", 1)])]
B = [("Am", [("A4", 1), ("C5", 1), ("E5", 1)]), ("Am", [("A5", 2), ("E5", 1)]),
     ("E7", [("G#5", 2), ("E5", 1)]), ("E7", [("B4", 3)]),
     ("E7", [("D5", 1), ("E5", 1), ("G#5", 1)]), ("E7", [("B5", 2), ("G#5", 1)]),
     ("Am", [("A5", 1), ("E5", 1), ("C5", 1)]), ("Am", [("A4", 3)]),
     ("Dm", [("D5", 1), ("F5", 1), ("A5", 1)]), ("Dm", [("D6", 2), ("A5", 1)]),
     ("Am", [("C6", 2), ("A5", 1)]), ("Am", [("E5", 3)]),
     ("E7", [("G#5", 1), ("B5", 1), ("D6", 1)]), ("E7", [("B5", 2), ("G#5", 1)]),
     ("Am", [("A5", 3)]), ("G7", [("G5", 2), ("F5", 1)])]
END = A[:14] + [("C", [("C5", 3)]), ("C", [("C5", 3)])]
SONG = A + B + END
BARS = len(SONG)
BEAT = (DUR - 1.2) / (BARS * 3)  # Sekunden pro Schlag, 1,2 s Ausklang
N = int(DUR * SR) + SR
L, R = np.zeros(N), np.zeros(N)


def add(x, t, gain, pan):
    i = int(t * SR)
    if i >= N:
        return
    x = x[: N - i] * gain
    a = (pan + 1) / 2 * np.pi / 2
    L[i:i + len(x)] += x * np.cos(a)
    R[i:i + len(x)] += x * np.sin(a)


def pluck(f, dur, bright=0.12, decay=3.0, hdecay=0.9, detune=0.0):
    """Gezupfte Saite additiv: Obertöne mit Zupfposition, hohe klingen schneller ab, Doppelsaite."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    hmax = int(min(24, 9000 / f))
    for h in range(1, hmax + 1):
        amp = abs(np.sin(np.pi * h * bright)) / h ** 1.05
        d = decay + hdecay * h * h
        for dt in ([0.0] if detune == 0 else [-detune, detune]):
            fh = f * h * (1 + 0.0004 * h * h) * 2 ** (dt / 1200)
            x += amp * np.sin(2 * np.pi * fh * t + RNG.random() * 6.28) * np.exp(-t * d)
    att = np.minimum(1, t / 0.002)
    pick = signal.sosfilt(signal.butter(2, [2000, 8000], "band", fs=SR, output="sos"), RNG.standard_normal(n)) * np.exp(-t * 400) * 0.15
    x = x * att + pick
    return x / (np.max(np.abs(x)) + 1e-9)


def reed(f, dur):
    """Akkordeon-Ton: drei Zungen (-7, 0, +7 Cent = Musette), weiche Hülle."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for c in (-7, 0, 7):
        ff = f * 2 ** (c / 1200)
        for h in range(1, int(min(14, 5000 / f)) + 1):
            x += np.sin(2 * np.pi * ff * h * t + 0.3 * h) / h ** 0.95
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.09) * (1 + 0.04 * np.sin(2 * np.pi * 4.5 * t))
    x = signal.sosfilt(signal.butter(2, 3200, "low", fs=SR, output="sos"), x) * env
    return x / (np.max(np.abs(x)) + 1e-9)


section = lambda b: "A1" if b < 16 else "B" if b < 32 else "A2"
for b, (ch, mel) in enumerate(SONG):
    t0 = 0.4 + b * 3 * BEAT
    sec = section(b)
    tones = CHORDS[ch]
    root = midi(tones[0] + "2") if NOTE[tones[0]] <= 4 else midi(tones[0] + "1") + 12
    # Gitarre: Bass auf 1 (Grundton / Quinte im Wechsel), Akkord auf 2 und 3
    bass = root if b % 2 == 0 else root + (7 if NOTE[tones[0]] <= 4 else -5)
    add(pluck(hz(bass), 1.4, bright=0.22, decay=2.6, hdecay=1.6), t0, 0.36, -0.15)
    chord = sorted(midi(n + "4") if NOTE[n] < 7 else midi(n + "3") for n in tones[:3])
    for beat in (1, 2):
        for k, m in enumerate(chord):
            add(pluck(hz(m), 0.5, bright=0.2, decay=6, hdecay=1.4), t0 + beat * BEAT + k * 0.012, 0.12, -0.3)
    # Akkordeon: gehaltener Akkord, erst ab Teil B
    if sec != "A1":
        for m in chord:
            add(reed(hz(m + 12), 3 * BEAT * 0.98), t0, 0.07 if sec == "B" else 0.055, 0.35)
    # Mandoline: Melodie, lange Töne mit Tremolo, zweite Stimme eine Terz tiefer
    tb = t0
    for note, beats in mel:
        if note != "-":
            m = midi(note)
            harm = max(x for x in [midi(n + str(o)) for n in tones for o in (3, 4, 5)] if x <= m - 3)
            for mm, g, pan in ((m, 0.42, 0.2), (harm, 0.2, 0.28)):
                f = hz(mm)
                if beats >= 2:  # Tremolo: schnelles Wechselschlagen
                    k, tt = 0, 0.0
                    while tt < beats * BEAT - 0.06:
                        add(pluck(f, 0.25, decay=5, hdecay=0.6, detune=3), tb + tt + RNG.normal(0, 0.003), g * (0.8 if k % 2 else 1.0) * 0.75, pan)
                        k += 1; tt += 1 / 12.5
                else:
                    add(pluck(f, 0.9, decay=3.5, hdecay=0.6, detune=3), tb, g, pan)
        tb += beats * BEAT

# Raum: kurzer Hall wie in einem kleinen Restaurant
irn = int(0.9 * SR)
ti = np.arange(irn) / SR
irs = [signal.sosfilt(signal.butter(1, 4500, "low", fs=SR, output="sos"), RNG.standard_normal(irn)) * np.exp(-ti / 0.16) for _ in range(2)]
wetL, wetR = signal.fftconvolve(L, irs[0])[:N], signal.fftconvolve(R, irs[1])[:N]
hp = signal.butter(2, 75, "high", fs=SR, output="sos")
mixL, mixR = signal.sosfilt(hp, L + wetL * 0.035), signal.sosfilt(hp, R + wetR * 0.035)
out = np.stack([mixL, mixR], 1)[: int(DUR * SR)]
fade = int(1.0 * SR)
out[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
out[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
out = out / (np.max(np.abs(out)) + 1e-9) * 0.8
raw = OUT + ".raw.wav"
with wave.open(raw, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), OUT], check=True)
subprocess.run(["rm", "-f", raw])
print(f"{OUT}: {BARS} Takte, {60 / BEAT:.0f} BPM, {DUR} s")
