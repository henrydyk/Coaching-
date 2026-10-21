"""Deutsches Voiceover pro Beat erzeugen (edge-tts) und Timing-Datei schreiben.

Aufruf:  python3 -I tts.py <video-ordner>
Liest    <video-ordner>/script.json  (Stimme, rate/pitch global oder pro Beat/Segment, "voice_fx")
Schreibt <video-ordner>/assets/audio/voiceover.wav und <video-ordner>/timing.json
"""
import asyncio, hashlib, json, os, subprocess, sys, wave

import certifi

# Der Session-Proxy terminiert TLS neu; edge-tts nutzt hart certifi -> auf das Proxy-Bundle zeigen.
_PROXY_CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(_PROXY_CA):
    certifi.where = lambda: _PROXY_CA
import edge_tts  # noqa: E402

SR = 48000
VOICE_FX = {
    "none": "",
    "cinematic": ("highpass=f=70,equalizer=f=130:t=q:w=1.0:g=3,equalizer=f=3200:t=q:w=1.4:g=2.5,"
                  "equalizer=f=7500:t=q:w=1.0:g=1.5,"
                  "acompressor=threshold=-22dB:ratio=3.5:attack=4:release=140:makeup=3,"
                  "aecho=0.85:0.7:28|57:0.10|0.05"),
}


def run(cmd):
    subprocess.run(cmd, check=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


async def synth(text, voice, rate, pitch, volume, out_mp3):
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume).save(out_mp3)


def silence(cache, seconds):
    path = os.path.join(cache, f"gap-{int(round(seconds * 1000))}.wav")
    if not os.path.exists(path):
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{seconds:.3f}", path])
    return path


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                       stdin=subprocess.DEVNULL, capture_output=True, text=True)
    return float([l for l in r.stderr.splitlines() if l.strip().startswith("I:")][-1].split()[1])


def wav_duration(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


def main(video_dir):
    cfg = json.load(open(os.path.join(video_dir, "script.json"), encoding="utf-8"))
    voice = cfg.get("voice", "de-DE-ConradNeural")
    rate, pitch = cfg.get("rate", "+0%"), cfg.get("pitch", "+0Hz")
    cache = os.path.join(video_dir, ".tts-cache")
    os.makedirs(cache, exist_ok=True)
    out_dir = os.path.join(video_dir, "assets", "audio")
    os.makedirs(out_dir, exist_ok=True)

    t = float(cfg.get("lead_in", 0.3))
    parts, timing = [], []
    parts.append(silence(cache, t))

    for beat in cfg["beats"]:
        # "say" darf ein String oder eine Liste von Segmenten sein (Regie pro Teilsatz):
        #   ["Um drei Uhr nachts …", {"text": "klopft es an deiner Tür.", "rate": "-10%", "gap": 0.45}]
        say = beat.get("say", beat["caption"])
        segments = say if isinstance(say, list) else [say]
        beat_start, beat_parts = t, []
        for j, seg in enumerate(segments):
            seg = {"text": seg} if isinstance(seg, str) else seg
            s_rate = seg.get("rate", beat.get("rate", rate))
            s_pitch = seg.get("pitch", beat.get("pitch", pitch))
            s_vol = seg.get("volume", beat.get("volume", "+0%"))
            key = hashlib.sha1(f"{voice}|{s_rate}|{s_pitch}|{s_vol}|{seg['text']}".encode()).hexdigest()[:12]
            mp3 = os.path.join(cache, f"{beat['id']}-{j}-{key}.mp3")
            wav = os.path.join(cache, f"{beat['id']}-{j}-{key}.wav")
            if not os.path.exists(wav):
                asyncio.run(synth(seg["text"], voice, s_rate, s_pitch, s_vol, mp3))
                # Stille am Anfang/Ende abschneiden, damit das Timing exakt ist.
                trim = ("silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                        "silenceremove=start_periods=1:start_threshold=-50dB,areverse")
                run(["ffmpeg", "-y", "-i", mp3, "-af", trim, "-ac", "1", "-ar", str(SR), wav])
            beat_parts.append(wav)
            t += wav_duration(wav)
            if j < len(segments) - 1:
                g = float(seg.get("gap", 0.3))
                beat_parts.append(silence(cache, g))
                t += g
        pause = float(beat.get("pause", 0.25))
        timing.append({"id": beat["id"], "caption": beat["caption"], "start": round(beat_start, 3),
                       "end": round(t, 3)})
        parts.extend(beat_parts)
        parts.append(silence(cache, pause))
        t += pause

    lst = os.path.join(cache, "concat.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    vo = os.path.join(out_dir, "voiceover.wav")
    raw = os.path.join(cache, "voiceover-raw.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-ar", str(SR), raw])
    # Klangfarbe: "cinematic" = Wärme, Präsenz, Kompression, kleiner Raum (Erzähler-Sound)
    fx = VOICE_FX.get(cfg.get("voice_fx", "none"), "")
    shaped = os.path.join(cache, "voiceover-fx.wav")
    run(["ffmpeg", "-y", "-i", raw] + (["-af", fx] if fx else []) + ["-ar", str(SR), shaped])
    # Stimme auf -16 LUFS (TikTok-üblich) bringen, linear
    gain = float(cfg.get("vo_lufs", -16.0)) - lufs(shaped)
    run(["ffmpeg", "-y", "-i", shaped, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89", "-ar", str(SR), vo])
    result = {"voice": voice, "total": round(t, 3), "beats": timing}
    json.dump(result, open(os.path.join(video_dir, "timing.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    for b in timing:
        print(f"{b['id']:>4}  {b['start']:6.2f}–{b['end']:6.2f}  {b['caption']}")
    print(f"Gesamt: {t:.2f} s  ({voice})")


if __name__ == "__main__":
    main(sys.argv[1])
