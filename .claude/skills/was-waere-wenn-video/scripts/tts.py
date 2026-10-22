"""Deutsches Voiceover pro Beat erzeugen und Timing-Datei schreiben.

Aufruf:  python3 -I tts.py <video-ordner>
Liest    <video-ordner>/script.json
Schreibt <video-ordner>/assets/audio/voiceover.wav und <video-ordner>/timing.json

Engines ("engine" in script.json):
- "chatterbox" (Standard für Erzähler): Chatterbox Multilingual (MIT) mit Stimmvorlage ("voice_ref",
  Standard: Thorsten, CC0). Emotion über "exaggeration" (0.25–1.0) und "cfg" (0.2–0.6, kleiner =
  dramatischeres Tempo), global, pro Beat oder pro Segment. Pro Segment entsteht zuerst eine Aufnahme;
  nur wenn Whisper den Text nicht sauber erkennt oder die Länge auffällt, folgen weitere Seeds (bis
  "candidates", Standard 3), und die beste gewinnt. Der Worker rechnet parallel auf allen Kernen. Setup:
  bash .claude/skills/was-waere-wenn-video/scripts/setup_chatterbox.sh
- "elevenlabs": ElevenLabs-API mit deutscher Stimme ("voice_id", "el_model", "stability", "style",
  "similarity", "el_speed"), Schlüssel aus ELEVENLABS_API_KEY. Gleiche Whisper-Qualitätsschleife.
- "edge": Microsoft-Neural-Stimmen über edge-tts ("voice", "rate", "pitch", "volume").

Harmonischer Fluss: "flow": 240 lässt mehrere Sätze am Stück sprechen (Absätze bis 240 Zeichen, neuer
Absatz bei Emotionswechsel, "break": true oder Endcard). Satzzeiten kommen dann aus Whisper-Wortzeiten.

Länge ohne Neugenerieren anpassen: "max_pause" (Sekunden, global/Beat/Segment) kürzt Pausen innerhalb
der Aufnahmen, "tempo" (z. B. 1.1) beschleunigt das ganze Voiceover, "pause"/"gap" steuern die Stille
zwischen Sätzen. Alle drei wirken nur beim Zusammensetzen, der Cache bleibt gültig.
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


def cap_pauses(src, dst, cap, thr_db=-40.0):
    """Pausen innerhalb einer Aufnahme auf "cap" Sekunden kürzen (Anfang/Ende bleiben). Geschnitten wird
    nur in Stille unter thr_db, Klang und Betonung der Stimme bleiben unverändert."""
    import numpy as np
    with wave.open(src) as w:
        sr, x = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), np.int16)
    hop = sr // 100
    n = len(x) // hop
    rms = np.sqrt(np.mean((x[:n * hop].astype(np.float32) / 32768).reshape(n, hop) ** 2, axis=1) + 1e-12)
    silent = 20 * np.log10(rms) < thr_db
    keep, capf, i = np.ones(len(x), bool), int(round(cap * 100)), 0
    while i < n:
        j = i
        while j < n and silent[j]:
            j += 1
        if j - i > capf and i > 0 and j < n:
            keep[(i + capf // 2) * hop:(j - (capf - capf // 2)) * hop] = False
        i = max(j, i + 1)
    with wave.open(dst, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(x[keep].tobytes())


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


def align_beats(path, texts, cfg, state):
    """Start/Ende jedes Satzes innerhalb einer Absatz-Aufnahme per Whisper-Wortzeiten (gecacht)."""
    cache_json = path[:-4] + ".words.json"
    if os.path.exists(cache_json):
        words = json.load(open(cache_json, encoding="utf-8"))
    else:
        import numpy as np
        from faster_whisper import WhisperModel
        if "asr" not in state:
            state["asr"] = WhisperModel(cfg.get("asr_model", "medium"), device="cpu", compute_type="int8")
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                             stdin=subprocess.DEVNULL, capture_output=True, check=True).stdout
        a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
        segs_, _ = state["asr"].transcribe(a, language="de", word_timestamps=True)
        words = [{"w": w.word, "start": w.start, "end": w.end} for sg in segs_ for w in sg.words]
        json.dump(words, open(cache_json, "w", encoding="utf-8"), ensure_ascii=False)
    rec = [(nw, w["start"], w["end"]) for w in words for nw in norm_words(w["w"])]
    exp = [(nw, i) for i, tx in enumerate(texts) for nw in norm_words(re.sub(r"\[[^\]]*\]", " ", tx))]
    sm = difflib.SequenceMatcher(None, [e[0] for e in exp], [r[0] for r in rec], autojunk=False)
    hit = {a + k: b + k for a, b, n in sm.get_matching_blocks() for k in range(n)}
    res = []
    for i in range(len(texts)):
        idx = [k for k, e in enumerate(exp) if e[1] == i and k in hit]
        res.append([rec[hit[idx[0]]][1], rec[hit[idx[-1]]][2]] if idx else None)
    dur = wav_duration(path)
    for i, r in enumerate(res):  # Sätze ohne erkannte Wörter zwischen die Nachbarn legen
        if r is None:
            prev_end = res[i - 1][1] if i and res[i - 1] else 0.0
            res[i] = [prev_end, next((x[0] for x in res[i + 1:] if x), dur)]
    res[0][0] = 0.0
    res[-1][1] = max(res[-1][1], dur - 0.05)
    return res


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


def synth_adaptive(segs, cfg, cache, generate, label):
    """Gemeinsame Qualitätsschleife für Chatterbox und ElevenLabs: pro Segment zuerst eine Aufnahme,
    Whisper prüft sie, nur unsaubere Segmente bekommen in der nächsten Runde einen neuen Seed.
    generate(items) erzeugt die Dateien items[i]["out"] (items: text, seed, out, seg)."""
    max_cand = int(cfg.get("candidates", 3))
    todo = [s for s in segs if not os.path.exists(s["wav"])]
    if not todo:
        return
    for s in todo:
        s["cands"] = [os.path.join(cache, f"{s['key']}-c{k}.wav") for k in range(max_cand)]
        s["scored"] = {}

    import numpy as np
    from faster_whisper import WhisperModel
    asr = None

    def score_existing(s):
        nonlocal asr
        for k, c in enumerate(s["cands"]):
            if k in s["scored"] or not os.path.exists(c):
                continue
            asr = asr or WhisperModel(cfg.get("asr_model", "medium"), device="cpu", compute_type="int8")
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", c, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
                                 stdin=subprocess.DEVNULL, capture_output=True, check=True).stdout
            a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
            # greedy (beam 1) reicht für den Textabgleich und ist ca. 3x schneller als die Standard-Beamsuche
            segs_, _ = asr.transcribe(a, language="de", beam_size=1, condition_on_previous_text=False, without_timestamps=True)
            txt = " ".join(seg.text for seg in segs_)
            spoken = re.sub(r"\[[^\]]*\]", " ", s["text"])  # ElevenLabs-Audio-Tags wie [whispers] werden nicht gesprochen
            score = difflib.SequenceMatcher(None, norm_words(txt), norm_words(spoken)).ratio()
            # In langen Absätzen fällt ein falsches Wort im Verhältnis kaum auf ("Dresden" -> "8", "Wachdienst" ->
            # "Waschdienst"). Deshalb kostet jedes nicht erkannte Wort ab 5 Buchstaben 0,1 Punkte.
            heard = set(norm_words(txt))
            missing = [w for w in norm_words(spoken) if len(w) >= 5 and w not in heard]
            s["scored"][k] = (score - 0.1 * len(missing), len(a) / 16000, c, txt.strip() + (f"  [fehlt: {', '.join(missing)}]" if missing else ""))

    def best(s):  # beste Übereinstimmung, bei Gleichstand die kürzere Aufnahme
        return max(s["scored"].values(), key=lambda v: (round(v[0], 3), -v[1]))

    # Runde k erzeugt Seed k+1 nur für Segmente, die noch nicht sauber sind. Sauber = Whisper erkennt den
    # Text (>= 0.9) und die Länge ist plausibel (kein angehängtes Gebrabbel). So entstehen im Schnitt
    # ca. 1,2 statt 2 Aufnahmen pro Segment, ohne dass eine schlechte Aufnahme durchrutscht.
    open_ = list(todo)
    for k in range(max_cand):
        items = [{"text": s["text"], "seed": k + 1, "out": s["cands"][k], "seg": s} for s in open_]
        print(f"{label} Runde {k + 1}: {len(items)} Segmente …", flush=True)
        generate([it for it in items if not os.path.exists(it["out"])])
        for s in todo:
            score_existing(s)
        rates = sorted(best(s)[1] / len(s["text"]) for s in todo if len(s["text"]) >= 15)
        med = rates[len(rates) // 2] if rates else 1.0
        open_ = [s for s in todo if best(s)[0] < 0.9 or (len(s["text"]) >= 15 and best(s)[1] / len(s["text"]) > 1.45 * med)]
        if not open_:
            break

    for s in todo:
        b = best(s)
        flag = "" if b[0] >= 0.85 else "  <-- prüfen!"
        print(f"  {b[0]:.2f} ({len(s['scored'])}x) {s['text'][:50]!r} -> {b[3][:60]!r}{flag}")
        af = TRIM.format(db=-45) + ",afade=t=in:d=0.012,areverse,afade=t=in:d=0.04,areverse"  # weiche Kanten
        if s["speed"] != 1.0:
            af += f",atempo={s['speed']}"
        run(["ffmpeg", "-y", "-i", b[2], "-af", af, "-ac", "1", "-ar", str(SR), s["wav"]])


def synth_chatterbox(segs, cfg, cache):
    root = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True).stdout.strip()
    py = os.path.join(root, ".venv-chatterbox", "bin", "python")
    if not os.path.exists(py):
        sys.exit("Chatterbox fehlt: bash .claude/skills/was-waere-wenn-video/scripts/setup_chatterbox.sh")
    ref = cfg.get("voice_ref", os.path.join(SKILL, "assets", "voices", "thorsten-ref.wav"))

    def generate(items):
        if not items:
            return
        job = os.path.join(cache, "chatterbox-job.json")
        payload = [{"text": it["text"], "ex": it["seg"]["ex"], "cfg": it["seg"]["cfg"], "seed": it["seed"], "out": it["out"]}
                   for it in items]
        json.dump({"ref": ref, "items": payload}, open(job, "w", encoding="utf-8"), ensure_ascii=False)
        subprocess.run([py, os.path.join(SKILL, "scripts", "chatterbox_worker.py"), job], check=True)

    synth_adaptive(segs, cfg, cache, generate, "Chatterbox")


def synth_elevenlabs(segs, cfg, cache):
    """ElevenLabs-API (Schlüssel aus der Umgebungsvariable ELEVENLABS_API_KEY, nie im Repo).
    script.json: "voice_id" (Pflicht), "el_model" (Standard eleven_v3), pro Beat/Segment "stability",
    "style", "similarity", "el_speed". Bei eleven_v3 steuern Audio-Tags im Text die Emotion, z. B.
    "[whispers] Niemand merkt etwas." Kommerzielle Nutzung nur mit Audio aus einem bezahlten Abo."""
    import ssl, urllib.error, urllib.request
    from concurrent.futures import ThreadPoolExecutor
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY fehlt: in den Umgebungseinstellungen (Network secrets) anlegen, neue Sitzung starten.")
    voice_id = cfg.get("voice_id") or sys.exit('"voice_id" fehlt in script.json (deutsche Stimme aus der Voice Library)')
    model = cfg.get("el_model", "eleven_v3")
    ca = "/root/.ccr/ca-bundle.crt"
    ctx = ssl.create_default_context(cafile=ca if os.path.exists(ca) else None)

    def one(it):
        s = it["seg"]
        settings = {"stability": float(s["stability"]), "similarity_boost": float(s["similarity"]),
                    "style": float(s["style"]), "use_speaker_boost": True, "speed": float(s["el_speed"])}
        body = {"text": it["text"], "model_id": model, "voice_settings": settings, "seed": int(it["seed"])}
        if model == "eleven_multilingual_v2":  # Kontext für Übergänge; v3 unterstützt das (noch) nicht
            body.update(previous_text=s.get("prev_text") or None, next_text=s.get("next_text") or None)
        else:
            body["language_code"] = "de"
        req = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
            data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=180, context=ctx) as r:
                data = r.read()
        except urllib.error.HTTPError as e:
            sys.exit(f"ElevenLabs {e.code}: {e.read().decode(errors='replace')[:400]}")
        mp3 = it["out"][:-4] + ".mp3"
        open(mp3, "wb").write(data)
        run(["ffmpeg", "-y", "-i", mp3, "-ac", "1", "-ar", str(SR), it["out"]])

    def generate(items):
        with ThreadPoolExecutor(int(cfg.get("el_parallel", 2))) as ex:  # Gratis-Plan erlaubt 2 parallele Anfragen
            list(ex.map(one, items))

    synth_adaptive(segs, cfg, cache, generate, "ElevenLabs")


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
                 "ex": float(get("exaggeration", 0.85)), "cfg": float(get("cfg", 0.3)), "speed": float(get("speed", 1.0)),
                 "max_pause": get("max_pause", None), "stability": float(get("stability", 0.5)),
                 "style": float(get("style", 0.0)), "similarity": float(get("similarity", 0.75)),
                 "el_speed": float(get("el_speed", 1.0))}
            sig = {"edge": f"{engine}|{voice}|{s['rate']}|{s['pitch']}|{s['volume']}",
                   "elevenlabs": f"{engine}|{cfg.get('voice_id')}|{cfg.get('el_model', 'eleven_v3')}|{s['stability']}|"
                                 f"{s['style']}|{s['similarity']}|{s['el_speed']}|{s['speed']}"}.get(
                engine, f"{engine}|{cfg.get('voice_ref', 'thorsten')}|{s['ex']}|{s['cfg']}|{s['speed']}")
            s["key"] = f"{beat['id']}-{j}-" + hashlib.sha1(f"{sig}|{s['text']}".encode()).hexdigest()[:12]
            s["wav"] = os.path.join(cache, s["key"] + ".wav")
            segs.append(s)
        plan.append((beat, segs))
    # "flow": mehrere Sätze am Stück sprechen lassen (Zeichen pro Absatz, z. B. 240). Klingt harmonischer als
    # Satz für Satz: Melodie und Atem laufen durch. Ein neuer Absatz beginnt bei Emotionswechsel (> 0.15),
    # bei "break": true und vor der Endcard.
    units = [{"beats": [beat], "segs": segs, "flow": False} for beat, segs in plan]
    flow = cfg.get("flow")
    if flow:
        limit = 240 if flow is True else int(flow)
        units, cur = [], None
        for beat, segs in plan:
            text = " ".join(x["text"] for x in segs)
            new = (cur is None or beat.get("break") or beat.get("role") == "endcard"
                   or abs(segs[0]["ex"] - cur["seg"]["ex"]) > 0.15 or len(cur["seg"]["text"]) + len(text) > limit)
            if new:
                cur = {"beats": [], "seg": dict(segs[0], text=""), "texts": [], "flow": True}
                units.append(cur)
            cur["beats"].append(beat)
            cur["texts"].append(text)
            cur["seg"]["text"] = " ".join(cur["texts"])
        for u in units:
            sg = u["seg"]
            sig = f"{engine}|{cfg.get('voice_ref', 'thorsten')}|{cfg.get('voice_id')}|{sg['ex']}|{sg['cfg']}|{sg['stability']}|{sg['speed']}"
            sg["key"] = f"flow-{u['beats'][0]['id']}-" + hashlib.sha1(f"{sig}|{sg['text']}".encode()).hexdigest()[:12]
            sg["wav"] = os.path.join(cache, sg["key"] + ".wav")
            u["segs"] = [sg]
        print(f"Flow: {len(plan)} Sätze in {len(units)} Absätzen", flush=True)
    all_segs = [s for u in units for s in u["segs"]]

    # 2) Synthese
    for i, s in enumerate(all_segs):  # Nachbartext hilft ElevenLabs bei Betonung und Übergängen
        s["prev_text"] = all_segs[i - 1]["text"] if i else ""
        s["next_text"] = all_segs[i + 1]["text"] if i + 1 < len(all_segs) else ""
    if engine == "chatterbox":
        synth_chatterbox(all_segs, cfg, cache)
    elif engine == "elevenlabs":
        synth_elevenlabs(all_segs, cfg, cache)
    else:
        synth_edge(all_segs)

    # 3) Zusammensetzen + Timing
    t = float(cfg.get("lead_in", 0.3))
    parts, timing, state = [silence(cache, t)], [], {}

    def shaped(s):
        if not s["max_pause"]:
            return s["wav"]
        src = s["wav"][:-4] + f"-p{int(float(s['max_pause']) * 1000)}.wav"  # lange Pausen kürzen, ohne neu zu generieren
        if not os.path.exists(src):
            cap_pauses(s["wav"], src, float(s["max_pause"]))
        return src

    for u in units:
        if u["flow"]:
            src = shaped(u["segs"][0])
            for beat, (b0, b1) in zip(u["beats"], align_beats(src, u["texts"], cfg, state)):
                timing.append({"id": beat["id"], "caption": beat["caption"], "start": round(t + b0, 3), "end": round(t + b1, 3)})
            parts.append(src)
            t += wav_duration(src)
        else:
            beat, segs = u["beats"][0], u["segs"]
            beat_start = t
            for j, s in enumerate(segs):
                src = shaped(s)
                parts.append(src)
                t += wav_duration(src)
                if j < len(segs) - 1:
                    parts.append(silence(cache, s["gap"]))
                    t += s["gap"]
            timing.append({"id": beat["id"], "caption": beat["caption"], "start": round(beat_start, 3), "end": round(t, 3)})
        pause = float(u["beats"][-1].get("pause", 0.25))
        parts.append(silence(cache, pause))
        t += pause

    lst = os.path.join(cache, "concat.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    vo = os.path.join(out_dir, "voiceover.wav")
    raw = os.path.join(cache, "voiceover-raw.wav")
    # "tempo": das ganze Voiceover gleichmäßig beschleunigen (atempo, Tonhöhe bleibt); Timing wird mitskaliert
    tempo = float(cfg.get("tempo", 1.0))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst] + (["-af", f"atempo={tempo}"] if tempo != 1.0 else [])
        + ["-ac", "1", "-ar", str(SR), raw])
    if tempo != 1.0:
        t /= tempo
        timing = [{**b, "start": round(b["start"] / tempo, 3), "end": round(b["end"] / tempo, 3)} for b in timing]
    # Klangfarbe: "cinematic" = Wärme, Präsenz, Kompression, kleiner Raum (Erzähler-Sound)
    fx = VOICE_FX.get(cfg.get("voice_fx", "none"), "")
    shaped = os.path.join(cache, "voiceover-fx.wav")
    run(["ffmpeg", "-y", "-i", raw] + (["-af", fx] if fx else []) + ["-ar", str(SR), shaped])
    # Stimme auf -16 LUFS (TikTok-üblich) bringen, linear
    gain = float(cfg.get("vo_lufs", -16.0)) - lufs(shaped)
    run(["ffmpeg", "-y", "-i", shaped, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89", "-ar", str(SR), vo])
    label = {"edge": voice, "elevenlabs": f"elevenlabs/{cfg.get('voice_id')}/{cfg.get('el_model', 'eleven_v3')}"}.get(
        engine, f"chatterbox/{os.path.basename(cfg.get('voice_ref', 'thorsten-ref.wav'))}")
    json.dump({"voice": label, "total": round(t, 3), "beats": timing},
              open(os.path.join(video_dir, "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    for b in timing:
        print(f"{b['id']:>4}  {b['start']:6.2f}–{b['end']:6.2f}  {b['caption']}")
    print(f"Gesamt: {t:.2f} s  ({label})")


if __name__ == "__main__":
    main(sys.argv[1])
