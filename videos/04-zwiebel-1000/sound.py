"""Sound für „Zwiebel, 1.000 Schnitte“ aus rounds.json: echte Hack-Geräusche (Aufnahme „Chopping leeks“,
Public Domain, einzelne Hiebe in assets/audio/chops/) genau auf jedem sichtbaren Messertreffer, im
Stereobild mit dem Messer von links nach rechts. Im 2. Durchgang fallen Würfel (Klopfer) bzw. rieselt der
Haufen. Darunter leise italienische Restaurant-Musik (eigene Komposition, italian_music.py).

Aufruf (im Videoordner): python3 -I sound.py  ->  assets/audio/sound.wav (48 kHz, Stereo, ca. -16 LUFS)
"""
import glob, json, os, subprocess, wave

import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(1000)
plan = json.load(open("rounds.json"))
DUR = plan["duration"]
N_SAMP = int(DUR * SR) + SR
L, Rch = np.zeros(N_SAMP), np.zeros(N_SAMP)
MUSIC_DB = -12  # Musik so viel leiser als die Schnitte (beide vorher auf -16 LUFS)


def read(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
        return x.reshape(-1, w.getnchannels()) if w.getnchannels() > 1 else x


def write(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def loudnorm(src, dst, i=-16):
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-af", f"loudnorm=I={i}:TP=-1.5:LRA=11", "-ar", str(SR), dst], check=True)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def place(x, t, gain_db, pan):
    i = int(t * SR)
    if i < 0 or i >= N_SAMP:
        return
    x = x[: N_SAMP - i] * 10 ** (gain_db / 20)
    a = (pan + 1) / 2 * np.pi / 2  # konstante Leistung
    L[i:i + len(x)] += x * np.cos(a)
    Rch[i:i + len(x)] += x * np.sin(a)


# Echte Hiebe: etwas mehr Biss (1,2–3 kHz) und kein Rumpeln, je Treffer leicht andere Tonhöhe
HP = signal.butter(2, 110, "high", fs=SR, output="sos")
CHOPS = []
for f in sorted(glob.glob("assets/audio/chops/chop*.wav")):
    x = signal.sosfilt(HP, read(f))
    x = x + 0.5 * bp(x, 1200, 3000)
    CHOPS.append(x / (np.max(np.abs(x)) + 1e-9))


def chop():
    x = CHOPS[RNG.integers(len(CHOPS))]
    r = 2 ** (RNG.normal(0, 0.05))  # ca. ±1 Halbton Streuung
    idx = np.arange(0, len(x) - 1, r)
    return np.interp(idx, np.arange(len(x)), x)


def thud():  # neue Zwiebel wird hingelegt: tiefer, weicher Hieb
    x = CHOPS[0]
    idx = np.arange(0, len(x) - 1, 0.62)
    y = signal.sosfilt(signal.butter(2, 700, "low", fs=SR, output="sos"), np.interp(idx, np.arange(len(x)), x))
    return y / (np.max(np.abs(y)) + 1e-9)


def tap():  # fallendes Stück auf dem Brett
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (550 + 450 * RNG.random()) * t) * np.exp(-t * 190) + bp(RNG.standard_normal(n), 2000, 6500) * np.exp(-t * 320) * 0.5
    return x / (np.max(np.abs(x)) + 1e-9)


def rustle(dur):  # feines Rieseln (viele winzige Würfel): Körner statt Rauschen
    n = int(dur * SR)
    x = np.zeros(n)
    k = int(dur * 900)
    pos = RNG.integers(0, max(1, n - 200), k)
    amp = RNG.random(k) ** 2
    for p, a in zip(pos, amp):
        x[p] += a * (1 if RNG.random() < 0.5 else -1)
    x = bp(x, 1800, 9000)
    env = np.minimum(1, np.arange(n) / (0.05 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.15 * SR))
    return x * env / (np.max(np.abs(x)) + 1e-9)


TAPS = [tap() for _ in range(16)]


def hits(a, b, rate):
    """Treffer des sichtbaren Messers (wie scene.js: Phase +0.2, Treffer bei 0.45)."""
    vis = min(rate, 9.0)
    k, out = 0, []
    while True:
        t = a + (k + 0.25) / vis
        if t >= b:
            return out, vis
        out.append(t)
        k += 1


for rd in plan["rounds"]:
    n, n1 = rd["n"], rd["n1"]
    if rd["cut0"] > rd["t0"]:
        place(thud(), rd["t0"] + 0.02, -10, 0.0)
    for ph, (a, b, cuts) in enumerate([(rd["cut0"], rd["cutM"], n1), (rd["cutM"], rd["cut1"], n - n1)]):
        ts, vis = hits(a, b, cuts / (b - a))
        fast = cuts / (b - a) > 9
        for t in ts:
            u = (t - a) / (b - a)
            pan = -0.35 + 0.7 * u
            place(chop(), t + RNG.normal(0, 0.003), -3 + RNG.normal(0, 1.0), pan)
            if fast:  # viele Schnitte pro Hieb: zwei leise Nachschläge machen es dichter
                for dt in (0.018, 0.037):
                    place(chop(), t + dt, -13 + RNG.normal(0, 1.5), pan)
        if ph == 1:  # 2. Durchgang: Stücke fallen
            k = n1 + 1
            if k <= 30:
                for _ in range(min(240, k * 8)):
                    u = RNG.random()
                    place(TAPS[RNG.integers(len(TAPS))], a + u * (b - a) + 0.1 + RNG.random() * 0.25, -21 - 6 * RNG.random(), -0.5 + u)
            else:
                place(rustle(b - a + 0.35), a + 0.05, -17, 0.0)
    if rd["final"]:
        place(rustle(1.8), rd["cut1"], -22, 0.0)

# Schnitte-Spur auf -16 LUFS, Musik (gleich lang) auf -16 LUFS, Musik leise darunter
os.makedirs("assets/audio", exist_ok=True)
fx = np.stack([L, Rch], axis=1)[: int(DUR * SR)]
fx = fx / (np.max(np.abs(fx)) + 1e-9) * 0.7
write("assets/audio/fx-raw.wav", fx)
loudnorm("assets/audio/fx-raw.wav", "assets/audio/fx.wav")
music_py = os.path.normpath(os.path.join(os.getcwd(), "..", "..", ".claude", "skills", "was-waere-wenn-video", "scripts", "italian_music.py"))
subprocess.run(["python3", "-I", music_py, str(DUR), "assets/audio/music.wav"], check=True)
fx, mu = read("assets/audio/fx.wav"), read("assets/audio/music.wav")
m = min(len(fx), len(mu))
mix = fx[:m] + mu[:m] * 10 ** (MUSIC_DB / 20)
write("assets/audio/sound-raw.wav", mix / (np.max(np.abs(mix)) + 1e-9) * 0.8)
loudnorm("assets/audio/sound-raw.wav", "assets/audio/sound.wav")
for f in ("fx-raw.wav", "fx.wav", "sound-raw.wav", "music.wav"):
    os.remove("assets/audio/" + f)
print("assets/audio/sound.wav geschrieben (Musik:", MUSIC_DB, "dB)")
