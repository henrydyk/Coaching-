"""Deutsches Voiceover pro Beat erzeugen (edge-tts) und Timing-Datei schreiben.

Aufruf:  python3 -I tts.py <video-ordner>
Liest    <video-ordner>/script.json
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


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


async def synth(text, voice, rate, pitch, out_mp3):
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(out_mp3)


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True)
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
    silence_lead = os.path.join(cache, "lead.wav")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{t:.3f}", silence_lead])
    parts.append(silence_lead)

    for beat in cfg["beats"]:
        say = beat.get("say", beat["caption"])
        key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{say}".encode()).hexdigest()[:12]
        mp3 = os.path.join(cache, f"{beat['id']}-{key}.mp3")
        wav = os.path.join(cache, f"{beat['id']}-{key}.wav")
        if not os.path.exists(wav):
            asyncio.run(synth(say, voice, rate, pitch, mp3))
            # Stille am Anfang/Ende abschneiden, damit das Timing exakt ist.
            trim = ("silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
                    "silenceremove=start_periods=1:start_threshold=-50dB,areverse")
            run(["ffmpeg", "-y", "-i", mp3, "-af", trim, "-ac", "1", "-ar", str(SR), wav])
        dur = wav_duration(wav)
        pause = float(beat.get("pause", 0.25))
        timing.append({"id": beat["id"], "caption": beat["caption"], "start": round(t, 3),
                       "end": round(t + dur, 3)})
        parts.append(wav)
        gap = os.path.join(cache, f"gap-{int(pause * 1000)}.wav")
        if not os.path.exists(gap):
            run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{pause:.3f}", gap])
        parts.append(gap)
        t += dur + pause

    lst = os.path.join(cache, "concat.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    vo = os.path.join(out_dir, "voiceover.wav")
    raw = os.path.join(cache, "voiceover-raw.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-ar", str(SR), raw])
    # Stimme auf -16 LUFS (TikTok-üblich) bringen, linear, ohne Kompressor-Pumpen
    gain = float(cfg.get("vo_lufs", -16.0)) - lufs(raw)
    run(["ffmpeg", "-y", "-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89", "-ar", str(SR), vo])
    result = {"voice": voice, "total": round(t, 3), "beats": timing}
    json.dump(result, open(os.path.join(video_dir, "timing.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    for b in timing:
        print(f"{b['id']:>4}  {b['start']:6.2f}–{b['end']:6.2f}  {b['caption']}")
    print(f"Gesamt: {t:.2f} s  ({voice})")


if __name__ == "__main__":
    main(sys.argv[1])
