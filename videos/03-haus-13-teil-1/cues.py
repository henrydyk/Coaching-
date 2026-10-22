"""Cues, HUD-Zeilen, Videolänge und sound.json für „Haus Nr. 13 – Teil 1“ aus timing.json + words.json.

Aufruf (im Videoordner): python3 -I cues.py
"""
import json, re

T = json.load(open("timing.json", encoding="utf-8"))
W = json.load(open("words.json", encoding="utf-8"))
B = {b["id"]: b for b in T["beats"]}
r = lambda x: round(x, 2)
st = lambda bid: B[bid]["start"]


def norm(s):
    return re.sub(r"[^a-zäöüß0-9]", "", s.lower())


def w(beat, word, nth=0):
    b, alts = B[beat], word if isinstance(word, list) else [word]
    hits = [x for x in W if b["start"] - 0.3 <= x["start"] <= b["end"] + 0.2 and any(norm(x["w"]).startswith(norm(a)) for a in alts)]
    if len(hits) <= nth:
        raise SystemExit(f"Wort {word} nicht in {beat}: {[x['w'] for x in W if b['start'] - 0.3 <= x['start'] <= b['end'] + 0.2]}")
    return hits[nth]["start"]


C = {f"s{k}": r(st(f"b{k + 1}") - 0.08) for k in range(1, 16)}
C["end"] = r(st("b17") - 0.08)
C["hookParts"] = [r(w("b1", "im")), r(w("b1", "trotzdem"))]
C["clockFlip"] = r(w("b4", ["drei", "3"]))
C["lightOn1"] = r(w("b5", "brennt"))
C["handUp"] = r(w("b7", "hebt"))
C["wave"] = r(w("b7", "winkt"))
C["pale"] = r(w("b9", "blass"))
C["fireFlash"] = r(w("b9", "nicht") - 0.08)
C["lightOn2"] = r(w("b10", "licht"))
C["photo"] = r(w("b12", "foto"))
C["someone"] = r(w("b14", "jemand"))
C["doorOpen"] = r(w("b16", "geht"))
C["frameShots"] = [[0, r(C["s1"] - 0.02)], [C["s4"], r(C["s5"] - 0.02)], [C["s9"], r(C["s10"] - 0.02)], [C["s14"], r(C["s15"] - 0.02)]]
DUR = r(max(T["total"] + 1.0, C["end"] + 3.6, 60.5))  # über 1 Minute (TikTok Creator Rewards)

deltas = [(r(w("b3", "nur")), r(C["s3"] - 0.1)), (r(C["lightOn1"] + 0.1), r(C["s5"] + 1.2)),
          (r(C["fireFlash"] + 0.15), r(C["s9"] - 0.1)), (r(C["someone"]), r(C["s14"] - 0.05)), (r(C["doorOpen"] + 0.2), r(C["end"] + 1.2))]
deltas = [(a, max(b, min(a + 1.9, (deltas[i + 1][0] - 0.2) if i + 1 < len(deltas) else b))) for i, (a, b) in enumerate(deltas)]

html = open("index.html", encoding="utf-8").read()
html = re.sub(r'<script id="cues" type="application/json">.*?</script>',
              '<script id="cues" type="application/json">\n      ' + json.dumps(C) + "\n    </script>", html, flags=re.S)
it = iter(deltas)
html, n = re.subn(r'(<div class="hud-delta[^"]*" )data-in="[\d.]+" data-out="[\d.]+"', lambda m: '{}data-in="{:.2f}" data-out="{:.2f}"'.format(m.group(1), *next(it)), html)
assert n == len(deltas), n
html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{DUR}"', html)
open("index.html", "w", encoding="utf-8").write(html)

s = C
ev = [
    {"type": "impact", "t": 0.0, "variant": "soft", "gain": -10},
    {"type": "heartbeat", "t": 0.1, "dur": r(s["s1"] - 0.3), "bpm": 64, "gain": -15},
    {"type": "whoosh", "t": r(s["s1"] - 0.3), "gain": -16},
    {"type": "birds", "t": r(s["s1"] + 0.2), "dur": r(s["s3"] - s["s1"] - 0.4), "gain": -27},
    {"type": "ticks", "t": s["s3"], "dur": r(s["s4"] - s["s3"]), "rate": 1, "gain": -16},
    {"type": "pop", "t": s["clockFlip"], "gain": -16},
    {"type": "zap", "t": r(s["lightOn1"] - 0.05), "dur": 0.5, "gain": -20},
    {"type": "impact", "t": s["lightOn1"], "variant": "soft", "gain": -13},
    {"type": "heartbeat", "t": s["s5"], "dur": r(s["wave"] - s["s5"]), "bpm": 78, "gain": -13},
    {"type": "riser", "t": r(s["wave"] - 1.2), "dur": 1.15, "gain": -17},
    {"type": "impact", "t": s["wave"], "gain": -7},
    {"type": "birds", "t": r(s["s7"] + 0.1), "dur": r(s["fireFlash"] - s["s7"] - 0.3), "gain": -28},
    {"type": "knock", "t": [r(s["s7"] + 0.25), r(s["s7"] + 0.6)], "gain": -11},
    {"type": "riser", "t": r(s["pale"] + 0.2), "dur": r(max(0.8, s["fireFlash"] - s["pale"] - 0.25)), "gain": -18},
    {"type": "whoomp", "t": s["fireFlash"], "gain": -8},
    {"type": "crackle", "t": s["fireFlash"], "dur": r(s["s9"] - s["fireFlash"]), "gain": -13},
    {"type": "ticks", "t": s["s9"], "dur": r(s["photo"] - s["s9"]), "rate": 1, "gain": -18},
    {"type": "zap", "t": r(s["lightOn2"] - 0.05), "dur": 0.5, "gain": -20},
    {"type": "heartbeat", "t": s["s10"], "dur": r(s["photo"] - s["s10"]), "bpm": 104, "gain": -12},
    {"type": "camera", "t": r(s["photo"] - 0.02), "gain": -6},
    {"type": "riser", "t": r(s["someone"] - 1.3), "dur": 1.25, "gain": -15},
    {"type": "impact", "t": s["someone"], "gain": -5},
    {"type": "hum", "t": s["s14"], "dur": r(s["s15"] - s["s14"]), "gain": -24},
    {"type": "creak", "t": s["doorOpen"], "dur": 2.3, "gain": -5},
    {"type": "whoosh", "t": r(s["doorOpen"] + 0.4), "dur": 1.4, "gain": -14},
    {"type": "impact", "t": r(s["doorOpen"] + 1.25), "gain": -7},
    {"type": "impact", "t": s["end"], "variant": "soft", "gain": -12},
    {"type": "pop", "t": [r(s["end"] + 0.95 + 0.25 * i) for i in range(4)], "gain": -17},
]
sound = {
    "duration": DUR, "target_lufs": -22,
    "bed": [
        {"mood": "horror", "from": 0, "to": r(s["s1"] + 0.3), "gain": -14},
        {"mood": "dawn", "from": r(s["s1"] - 0.2), "to": r(s["s3"] + 0.3), "gain": -24},
        {"mood": "horror", "from": r(s["s3"] - 0.2), "to": r(s["s7"] + 0.3), "gain": -14},
        {"mood": "dawn", "from": r(s["s7"] - 0.2), "to": r(s["fireFlash"] + 0.3), "gain": -24},
        {"mood": "horror", "from": r(s["fireFlash"] - 0.2), "to": DUR, "gain": -14},
    ],
    # Stille als Effekt: kurz vor dem Winken, vor dem Foto-Fund und bevor die Tür aufgeht
    "bed_gain": [[0, 0], [r(s["wave"] - 0.5), 0], [r(s["wave"] - 0.3), -12], [r(s["wave"] + 0.1), 0],
                 [r(s["s14"]), 0], [r(s["s14"] + 0.2), -10], [r(s["doorOpen"] - 0.3), -14], [r(s["doorOpen"] + 0.3), 0], [DUR, 0]],
    "events": ev,
}
json.dump(sound, open("sound.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(C))
print("Dauer", DUR, "| VO", T["total"], "| Endcard", r(DUR - C["end"]), "| Deltas", deltas)
