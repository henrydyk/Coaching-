"""Deutsche Erzählerstimmen in der ElevenLabs Voice Library finden und Hörproben erzeugen.

  python3 -I el_voices.py list [suchwort]            # deutsche Stimmen (Erzählen/Storytelling) auflisten
  python3 -I el_voices.py sample <ordner> <public_owner_id>:<voice_id> ...   # Stimme(n) hinzufügen + Hook sprechen

Die Vorschau-MP3s ("preview_url") der Library kosten keine Credits. Eine Hörprobe per API kostet ca. 1 Credit
pro Zeichen. Schlüssel: Umgebungsvariable ELEVENLABS_API_KEY (nie in Dateien oder im Chat).
"""
import json, os, ssl, sys, urllib.parse, urllib.request

KEY = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY fehlt (Umgebungseinstellungen, neue Sitzung)")
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA if os.path.exists(CA) else None)
HOOK = ("[dramatic] Zwei Männer. Eine Axt. Hundertdreizehn Millionen Euro. "
        "[whispers] Und ein Diamant mit fast fünfzig Karat ist bis heute verschwunden.")


def api(path, body=None, raw=False):
    req = urllib.request.Request("https://api.elevenlabs.io" + path, data=json.dumps(body).encode() if body else None,
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120, context=CTX) as r:
        data = r.read()
    return data if raw else json.loads(data)


def list_voices(search=""):
    q = {"page_size": 40, "language": "de", "sort": "usage_character_count_1y"}
    if search:
        q["search"] = search
    for use_case in ("narrative_story", "informative_educational", ""):
        if use_case:
            q["use_cases"] = use_case
        else:
            q.pop("use_cases", None)
        voices = api("/v1/shared-voices?" + urllib.parse.urlencode(q)).get("voices", [])
        for v in voices:
            print(f"{v['public_owner_id']}:{v['voice_id']}  {v['name'][:30]:30} {v.get('gender', ''):6} {v.get('age', ''):11} "
                  f"{v.get('accent', ''):10} {v.get('use_case', ''):22} {v.get('description', '')[:60]!r}\n    Vorschau: {v.get('preview_url')}")
        if voices:
            return


def best_model():
    try:
        ids = {m["model_id"] for m in api("/v1/models") if m.get("can_do_text_to_speech", True)}
    except Exception:
        ids = set()
    return next((m for m in ("eleven_v4", "eleven_v3", "eleven_multilingual_v2") if m in ids), "eleven_v3")


def sample(folder, ids):
    os.makedirs(folder, exist_ok=True)
    mine = {v["voice_id"] for v in api("/v1/voices").get("voices", [])}
    model = best_model()
    print("Modell:", model)
    for pair in ids:
        owner, vid = pair.split(":")
        if vid not in mine:  # Library-Stimmen müssen erst ins eigene Konto
            vid = api(f"/v1/voices/add/{owner}/{vid}", {"new_name": f"de-{vid[:6]}"})["voice_id"]
        audio = api(f"/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
                    {"text": HOOK, "model_id": model, "language_code": "de",
                     "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}, raw=True)
        out = os.path.join(folder, f"elevenlabs_{vid}.mp3")
        open(out, "wb").write(audio)
        print(out)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    if cmd == "list":
        list_voices(" ".join(sys.argv[2:]))
    elif cmd == "sample":
        sample(sys.argv[2], sys.argv[3:])
