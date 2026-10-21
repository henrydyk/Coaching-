"""Sounddesign (Klangteppich + Effekte) komplett synthetisch erzeugen, mit Ducking unter dem Voiceover.

Aufruf:  python3 -I sounddesign.py <video-ordner>
Liest    <video-ordner>/sound.json und assets/audio/voiceover.wav
Schreibt <video-ordner>/assets/audio/sounddesign.wav (48 kHz, Stereo)

sound.json:
{
  "duration": 30,
  "bed":    [{"mood": "dusk|night|dawn|tension|wonder", "from": 0, "to": 8}],
  "events": [{"type": "impact", "t": 0, "gain": -6, ...}]
}
Event-Typen: impact, whoosh, powerdown, siren, shutters, glass, crackle, ticks, heartbeat,
             birds, pop, riser, cash. "t" darf auch eine Liste sein.
"""
import json, os, subprocess, sys

import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(20261021)


def secs(d):
    return np.arange(int(d * SR)) / SR


def db(g):
    return 10 ** (g / 20)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, btype="low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return signal.sosfilt(signal.butter(order, fc, btype="high", fs=SR, output="sos"), x)


def fade(x, a=0.01, r=0.05):
    n = len(x)
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return x * e


def norm(x):
    p = np.max(np.abs(x)) or 1
    return x / p


def echo(x, taps=((0.13, 0.45), (0.29, 0.3), (0.51, 0.18))):
    out = np.concatenate([x, np.zeros(int(0.8 * SR))])
    for d, g in taps:
        k = int(d * SR)
        out[k:k + len(x)] += x * g
    return out


# ---------- Klänge ----------

def pad(dur, freqs, cutoff=900, detune=0.004, trem=0.0, trem_rate=2.0):
    t = secs(dur)
    x = np.zeros_like(t)
    for f in freqs:
        for d in (-detune, 0, detune):
            ph = RNG.uniform(0, 1)
            x += signal.sawtooth(2 * np.pi * f * (1 + d) * t + ph * 2 * np.pi)
    x = lp(x, cutoff, 4)
    x *= 1 + 0.15 * np.sin(2 * np.pi * 0.13 * t)
    if trem:
        x *= 1 - trem * (0.5 + 0.5 * np.sin(2 * np.pi * trem_rate * t))
    return norm(fade(x, 1.2, 1.2))


MOODS = {
    # Grundton D. "night" mit Es (kleine Sekunde) für Bedrohung
    "dusk": dict(freqs=[146.8, 174.6, 220.0, 329.6], cutoff=900, sub=73.4),
    "night": dict(freqs=[73.4, 110.0, 155.6, 220.0], cutoff=520, sub=36.7, trem=0.35, trem_rate=1.6),
    "tension": dict(freqs=[73.4, 103.8, 146.8], cutoff=600, sub=36.7, trem=0.25, trem_rate=3.0),
    "dawn": dict(freqs=[146.8, 185.0, 220.0, 293.7], cutoff=1500, sub=73.4),
    "wonder": dict(freqs=[130.8, 164.8, 196.0, 246.9, 329.6], cutoff=1800, sub=65.4),
}


def bed_segment(mood, dur):
    m = MOODS[mood]
    x = pad(dur, m["freqs"], m["cutoff"], trem=m.get("trem", 0), trem_rate=m.get("trem_rate", 2))
    t = secs(dur)
    sub = fade(np.sin(2 * np.pi * m["sub"] * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.21 * t)), 1.0, 1.0)
    return 0.7 * x + 0.45 * sub


def impact(variant="hard"):
    d = 2.4 if variant == "hard" else 1.4
    t = secs(d)
    f = 30 + 70 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.2 if variant == "hard" else 3.5))
    noise = lp(RNG.standard_normal(len(t)), 400) * np.exp(-t * 14)
    click = hp(RNG.standard_normal(len(t)), 2000) * np.exp(-t * 90) * 0.4
    return norm(fade(body + 0.6 * noise + click, 0.002, 0.3))


def whoosh(dur=0.5):
    t = secs(dur + 0.3)
    n = RNG.standard_normal(len(t))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    lo = lp(n, 700) * env
    hi = bp(n, 1500, 6000) * env ** 3
    return norm(fade(lo + 0.5 * hi, 0.01, 0.2))


def powerdown():
    t = secs(0.8)
    f = 60 + 360 * np.exp(-t * 5)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5)
    x += 0.5 * hp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 120)
    return norm(fade(x, 0.002, 0.2))


def siren(dur=3.5, variant="start"):
    t = secs(dur)
    lo, hi = (330, 820) if variant == "start" else (300, 640)
    rise = np.clip(t / (dur * 0.35), 0, 1)
    fall = np.clip((t - dur * 0.65) / (dur * 0.35), 0, 1)
    if variant == "end":  # Ende der Nacht: nur abfallend
        rise = np.ones_like(t)
        fall = np.clip(t / dur, 0, 1)
    f = lo + (hi - lo) * (1 - (1 - rise) ** 2) - (hi - lo) * 0.85 * fall ** 1.5
    f *= 1 + 0.012 * np.sin(2 * np.pi * 5.5 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.28 * np.sin(3 * ph) + 0.12 * np.sin(5 * ph)
    x = np.tanh(1.8 * x)
    x = bp(x, 220, 3200)
    x = fade(x, 0.25, dur * 0.25)
    return norm(echo(x))


def shutter():
    d = 0.55
    t = secs(d)
    rate = 38
    clicks = (np.sin(2 * np.pi * rate * t) > 0.85).astype(float)
    x = bp(clicks * RNG.standard_normal(len(t)), 1200, 5200) * 1.2
    x += lp(RNG.standard_normal(len(t)), 250) * 0.5
    x *= np.minimum(1, t / 0.04) * np.exp(-np.maximum(0, t - 0.42) * 30)
    thud = np.sin(2 * np.pi * 90 * secs(0.2)) * np.exp(-secs(0.2) * 30)
    out = np.zeros(len(t) + len(thud))
    out[: len(t)] += x
    k = int(0.45 * SR)
    out[k:k + len(thud)] += thud
    return norm(fade(out, 0.005, 0.05))


def glass():
    d = 1.6
    t = secs(d)
    x = hp(RNG.standard_normal(len(t)), 2500) * np.exp(-t * 9)
    x += 0.8 * lp(RNG.standard_normal(len(t)), 300) * np.exp(-t * 25)
    for _ in range(70):
        st = RNG.uniform(0, 0.8) ** 1.6
        f = RNG.uniform(2400, 7800)
        dec = RNG.uniform(25, 70)
        i0 = int(st * SR)
        tt = secs(d - st)
        x[i0:i0 + len(tt)] += 0.35 * RNG.uniform(0.3, 1) * np.sin(2 * np.pi * f * tt) * np.exp(-tt * dec)
    return norm(fade(x, 0.001, 0.2))


def crackle(dur):
    t = secs(dur)
    imp = (RNG.random(len(t)) < 0.0009).astype(float) * RNG.uniform(0.2, 1, len(t))
    x = bp(imp, 900, 5000) * 3 + lp(RNG.standard_normal(len(t)), 180) * 0.35
    return norm(fade(x, 0.5, 0.6))


def ticks(dur, rate=2.0):
    t = secs(dur)
    x = np.zeros_like(t)
    tick = hp(RNG.standard_normal(int(0.012 * SR)), 1800) * np.exp(-secs(0.012) * 400)
    for k in np.arange(0, dur, 1 / rate):
        i = int(k * SR)
        x[i:i + len(tick)] += tick * (1 if int(k * rate) % 2 == 0 else 0.7)
    return norm(x)


def heartbeat(dur, bpm=72):
    t = secs(dur)
    x = np.zeros_like(t)
    beat = lambda g: g * np.sin(2 * np.pi * 52 * secs(0.25)) * np.exp(-secs(0.25) * 18)
    for k in np.arange(0, dur - 0.5, 60 / bpm):
        for off, g in ((0, 1.0), (0.27, 0.65)):
            i = int((k + off) * SR)
            b = beat(g)
            x[i:i + len(b)] += b[: len(x) - i]
    return norm(fade(x * np.linspace(0.6, 1, len(x)), 0.01, 0.3))


def birds(dur):
    t = secs(dur)
    x = np.zeros_like(t)
    for st in np.sort(RNG.uniform(0.2, dur - 0.6, 14)):
        for j in range(RNG.integers(2, 5)):
            c = secs(0.07)
            f0 = RNG.uniform(3200, 4600)
            ch = np.sin(2 * np.pi * np.cumsum(f0 + 1600 * np.sin(np.pi * c / 0.07)) / SR) * np.sin(np.pi * c / 0.07)
            i = int((st + j * 0.11) * SR)
            x[i:i + len(c)] += ch[: max(0, len(x) - i)] * RNG.uniform(0.4, 1)
    return norm(fade(x, 0.3, 0.6))


def pop():
    t = secs(0.09)
    f = 700 + 900 * (t / 0.09)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.09) ** 2)


def riser(dur=1.5):
    t = secs(dur)
    f = 200 * 2 ** (t / dur * 2.5)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(RNG.standard_normal(len(t)), 800, 6000) * (t / dur) ** 2
    return norm(fade(x * (t / dur) ** 1.5, 0.01, 0.03))


def cash():
    t = secs(0.6)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((2093, 9), (2637, 10), (3136, 12)))
    return norm(fade(x + 0.3 * hp(RNG.standard_normal(len(t)), 4000) * np.exp(-t * 60), 0.002, 0.1))


def make_event(ev):
    k = ev["type"]
    if k == "impact":
        return impact(ev.get("variant", "hard"))
    if k == "whoosh":
        return whoosh(ev.get("dur", 0.5))
    if k == "powerdown":
        return powerdown()
    if k == "siren":
        return siren(ev.get("dur", 3.5), ev.get("variant", "start"))
    if k == "shutters":
        n, spread = ev.get("count", 5), ev.get("spread", 1.2)
        s = shutter()
        x = np.zeros(int((spread + 0.8) * SR))
        for i in range(n):
            o = int((i / max(1, n - 1)) * spread * SR + RNG.uniform(0, 0.08) * SR)
            x[o:o + len(s)] += s[: len(x) - o] * RNG.uniform(0.6, 1)
        return norm(x)
    if k == "glass":
        return glass()
    if k == "crackle":
        return crackle(ev.get("dur", 5))
    if k == "ticks":
        return ticks(ev.get("dur", 5), ev.get("rate", 2))
    if k == "heartbeat":
        return heartbeat(ev.get("dur", 5), ev.get("bpm", 72))
    if k == "birds":
        return birds(ev.get("dur", 5))
    if k == "pop":
        return pop()
    if k == "riser":
        return riser(ev.get("dur", 1.5))
    if k == "cash":
        return cash()
    raise ValueError(f"Unbekannter Event-Typ: {k}")


def place(buf, x, t, gain, pan=0.0):
    i = int(t * SR)
    if i >= buf.shape[1]:
        return
    n = min(len(x), buf.shape[1] - i)
    a = (pan + 1) * np.pi / 4
    buf[0, i:i + n] += x[:n] * db(gain) * np.cos(a)
    buf[1, i:i + n] += x[:n] * db(gain) * np.sin(a)


def read_wav_mono(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def main(video_dir):
    cfg = json.load(open(os.path.join(video_dir, "sound.json"), encoding="utf-8"))
    dur = float(cfg["duration"])
    N = int(dur * SR)
    bed = np.zeros((2, N))
    sfx = np.zeros((2, N))

    for seg in cfg.get("bed", []):
        x = bed_segment(seg["mood"], seg["to"] - seg["from"])
        place(bed, x, seg["from"], seg.get("gain", -20), 0)
        # leichte Stereobreite
        place(bed, np.roll(x, int(0.011 * SR)) * 0.35, seg["from"], seg.get("gain", -20), 0.8)

    for ev in cfg.get("events", []):
        times = ev["t"] if isinstance(ev["t"], list) else [ev["t"]]
        for t in times:
            place(sfx, make_event(ev), t, ev.get("gain", -12), ev.get("pan", 0.0))

    # Ducking: Bett deutlich, Effekte leicht unter der Stimme absenken
    vo_path = os.path.join(video_dir, "assets", "audio", "voiceover.wav")
    if os.path.exists(vo_path):
        vo = read_wav_mono(vo_path)[:N]
        env = np.zeros(N)
        env[: len(vo)] = np.abs(vo)
        env = lp(env, 6, 2)
        env = np.clip(env / (np.percentile(env, 95) or 1), 0, 1)
        bed *= 1 - cfg.get("duck_bed", 0.6) * env
        sfx *= 1 - cfg.get("duck_sfx", 0.3) * env

    mix = bed + sfx
    end_fade = int(cfg.get("end_fade", 0.8) * SR)
    mix[:, -end_fade:] *= np.linspace(1, 0, end_fade)
    peak = np.max(np.abs(mix)) or 1
    mix = mix / peak * db(-1.0)
    out = os.path.join(video_dir, "assets", "audio", "sounddesign.wav")
    write_wav(out, mix)
    # Lautheit auf Ziel bringen (Stimme liegt bei -16 LUFS, Sounddesign deutlich darunter)
    target = cfg.get("target_lufs", -23.0)
    gain = target - lufs(out)
    mix = mix * db(gain)
    if np.max(np.abs(mix)) > db(-1.0):
        mix = mix / np.max(np.abs(mix)) * db(-1.0)
    write_wav(out, mix)
    print(f"Geschrieben: {out}  ({dur:.1f} s, {lufs(out):.1f} LUFS)")


def write_wav(path, stereo):
    pcm = (np.clip(stereo.T, -1, 1) * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", path],
                   input=pcm, check=True)


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
    line = [l for l in r.stderr.splitlines() if l.strip().startswith("I:")][-1]
    return float(line.split()[1])


if __name__ == "__main__":
    main(sys.argv[1])
