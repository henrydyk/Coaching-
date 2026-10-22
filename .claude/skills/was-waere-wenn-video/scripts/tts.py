"""Deutsches Voiceover pro Beat erzeugen und Timing-Datei schreiben.

Aufruf:  python3 -I tts.py <video-ordner>
Liest    <video-ordner>/script.json
Schreibt <video-ordner>/assets/audio/voiceover.wav und <video-ordner>/timing.json

Engines ("engine" in script.json):
- "chatterbox" (Standard für Erzähler): Chatterbox Multilingual (MIT) mit Stimmvorlage ("voice_ref",
  Standard: Thorsten, CC0). Emotion über "exaggeration" (0.25–1.0) und "cfg" (0.2–0.6, kleiner =
  dramatischeres Tempo), global, pro Beat oder pro Segment. Pro Segment werden "candidates" Varianten
  erzeugt; Whisper wählt die, deren Transkript am besten zum Text passt. Setup:
  bash .claude/skills/was-waere-wenn-video/scripts/setup_chatterbox.sh
- "edge": Microsoft-Neural-Stimmen über edge-tts ("voice", "rate", "pitch", "volume").
"""
import asyncio, difflib, hashlib, json, os, re, subprocess, sys, wave

SR = 48000
SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_FX = {
    "none": "",
    "cinematic": ("highpass=f=70,equalizer=f=130:t=q:w=1.0:g=3,equalizer=f=3200:t=q:w=1.4:g=2.5,"
                  "equalizer=f=7500:t=q:w=1.0:g=1.5,"
                  "acompressor=threshold=-22dB:ratio=3.5:attack=4:release=140:makeup=3,"
                  "aecho=0.85:0.7:28|57:0.10|0.05"),
}
TRIM = ("silenceremove=start_periods=1:start_threshold={db}dB,areverse,"
        "silenceremove=start_periods=1:start_threshold={db}dB,areverse")


def run(cmd):
    subprocess.run(cmd, check=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


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


# ---------- Zahlen für den Whisper-Abgleich ("113" == "hundertdreizehn") ----------
_ONES = ["null", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf",
         "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"]
_TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"]


def de_num(n):
    if n < 20:
        return "eins" if n == 1 else _ONES[n]
    if n < 100:
        o, t = n % 10, n // 10
        return _TENS[t] if o == 0 else f"{_ONES[o]}und{_TENS[t]}"
    if n < 1000:
        h, r = divmod(n, 100)
        return f"{'ein' if h == 1 else _ONES[h]}hundert{de_num(r) if r else ''}"
    th, r = divmod(n, 1000)
    return f"{'ein' if th == 1 else de_num(th)}tausend{de_num(r) if r else ''}"


def norm_words(s):
    s = s.lower()
    s = re.sub(r"(\d)[.,](\d{3})", r"\1\2", s)
    s = re.sub(r"\d+", lambda m: de_num(int(m.group())) if int(m.group()) < 10000 else m.group(), s)
    return re.sub(r"[^a-zäöüß ]", " ", s).split()


# ---------- Engines ----------
def synth_edge(segs):
    import certifi
    proxy_ca = "/root/.ccr/ca-bundle.crt"  # Session-Proxy terminiert TLS neu; edge-tts nutzt hart certifi
    if os.path.exists(proxy_ca):
        certifi.where = lambda: proxy_ca
    import edge_tts

    for s in segs:
        if os.path.exists(s["wav"]):
            continue
        mp3 = s["wav"][:-4] + ".mp3"
        asyncio.run(edge_tts.Communicate(s["text"], s["voice"], rate=s["rate"], pitch=s["pitch"], volume=s["volume"]).save(mp3))
        run(["ffmpeg", "-y", "-i", mp3, "-af", TRIM.format(db=-50), "-ac", "1", "-ar", str(SR), s["wav"]])


def synth_chatterbox(segs, cfg, cache):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip()
    py = os.path.join(root, ".venv-chatterbox", "bin", "python")
    if not os.path.exists(py):
        sys.exit("Chatterbox fehlt: bash .claude/skills/was-waere-wenn-video/scripts/setup_chatterbox.sh")
    ref = cfg.get("voice_ref", os.path.join(SKILL, "assets", "voices", "thorsten-ref.wav"))
    n_cand = int(cfg.get("candidates", 2))
    todo = [s for s in segs if not os.path.exists(s["wav"])]
    if not todo:
        return
    items = []
    for s in todo:
        s["cands"] = [os.path.join(cache, f"{s['key']}-c{k}.wav") for k in range(n_cand)]
        items += [{"text": s["text"], "ex": s["ex"], "cfg": s["cfg"], "seed": k + 1, "out": c} for k, c in enumerate(s["cands"])]
    job = os.path.join(cache, "chatterbox-job.json")
    json.dump({"ref": ref, "items": items}, open(job, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"Chatterbox: {len(items)} Kandidaten …", flush=True)
    subprocess.run([py, os.path.join(SKILL, "scripts", "chatterbox_worker.py"), job], check=True)

    # Beste Variante per Whisper wählen (Text-Übereinstimmung; bei Gleichstand die kürzere)
    import numpy as np
    from faster_whisper import WhisperModel
    model = WhisperModel(cfg.get("asr_model", "medium"), device="cpu", compute_type="int8")
    for s in todo:
        scored = []
        for c in s["cands"]:
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", c, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                                 stdin=subprocess.DEVNULL, capture_output=True, check=True).stdout
            a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
            txt = " ".join(seg.text for seg in model.transcribe(a, language="de")[0])
            score = difflib.SequenceMatcher(None, norm_words(txt), norm_words(s["text"])).ratio()
            scored.append((score, -len(a), c, txt.strip()))
        scored.sort(reverse=True)
        best = scored[0]
        flag = "" if best[0] >= 0.85 else "  <-- prüfen!"
        print(f"  {best[0]:.2f} {s['text'][:50]!r} -> {best[3][:60]!r}{flag}")
        af = TRIM.format(db=-45)
        if s["speed"] != 1.0:
            af += f",atempo={s['speed']}"
        run(["ffmpeg", "-y", "-i", best[2], "-af", af, "-ac", "1", "-ar", str(SR), s["wav"]])


def main(video_dir):
    cfg = json.load(open(os.path.join(video_dir, "script.json"), encoding="utf-8"))
    engine = cfg.get("engine", "edge")
    voice = cfg.get("voice", "de-DE-ConradNeural")
    cache = os.path.join(video_dir, ".tts-cache")
    os.makedirs(cache, exist_ok=True)
    out_dir = os.path.join(video_dir, "assets", "audio")
    os.makedirs(out_dir, exist_ok=True)

    # 1) Alle Segmente mit ihren Parametern sammeln
    plan = []
    for beat in cfg["beats"]:
        # "say": String oder Liste von Segmenten mit eigener Regie, z. B.
        #   ["Um drei Uhr nachts …", {"text": "klopft es an deiner Tür.", "exaggeration": 0.95, "gap": 0.45}]
        say = beat.get("say", beat["caption"])
        segments = say if isinstance(say, list) else [say]
        segs = []
        for j, seg in enumerate(segments):
            seg = {"text": seg} if isinstance(seg, str) else seg
            get = lambda k, d: seg.get(k, beat.get(k, cfg.get(k, d)))
            s = {"text": seg["text"], "gap": float(seg.get("gap", 0.3)), "voice": voice,
                 "rate": get("rate", "+0%"), "pitch": get("pitch", "+0Hz"), "volume": get("volume", "+0%"),
                 "ex": float(get("exaggeration", 0.85)), "cfg": float(get("cfg", 0.3)), "speed": float(get("speed", 1.0))}
            sig = (f"{engine}|{voice}|{s['rate']}|{s['pitch']}|{s['volume']}" if engine == "edge"
                   else f"{engine}|{cfg.get('voice_ref', 'thorsten')}|{s['ex']}|{s['cfg']}|{s['speed']}")
            s["key"] = f"{beat['id']}-{j}-" + hashlib.sha1(f"{sig}|{s['text']}".encode()).hexdigest()[:12]
            s["wav"] = os.path.join(cache, s["key"] + ".wav")
            segs.append(s)
        plan.append((beat, segs))
    all_segs = [s for _, segs in plan for s in segs]

    # 2) Synthese
    if engine == "chatterbox":
        synth_chatterbox(all_segs, cfg, cache)
    else:
        synth_edge(all_segs)

    # 3) Zusammensetzen + Timing
    t = float(cfg.get("lead_in", 0.3))
    parts, timing = [silence(cache, t)], []
    for beat, segs in plan:
        beat_start = t
        for j, s in enumerate(segs):
            parts.append(s["wav"])
            t += wav_duration(s["wav"])
            if j < len(segs) - 1:
                parts.append(silence(cache, s["gap"]))
                t += s["gap"]
        timing.append({"id": beat["id"], "caption": beat["caption"], "start": round(beat_start, 3), "end": round(t, 3)})
        pause = float(beat.get("pause", 0.25))
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
    label = voice if engine == "edge" else f"chatterbox/{os.path.basename(cfg.get('voice_ref', 'thorsten-ref.wav'))}"
    json.dump({"voice": label, "total": round(t, 3), "beats": timing},
              open(os.path.join(video_dir, "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    for b in timing:
        print(f"{b['id']:>4}  {b['start']:6.2f}–{b['end']:6.2f}  {b['caption']}")
    print(f"Gesamt: {t:.2f} s  ({label})")


if __name__ == "__main__":
    main(sys.argv[1])
