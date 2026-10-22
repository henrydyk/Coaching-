"""Cues, HUD-Deltas und sound.json für 02-gruenes-gewoelbe aus timing.json + words.json ableiten."""
import json, re, sys

V = sys.argv[1]
T = json.load(open(f"{V}/timing.json"))
W = json.load(open(f"{V}/words.json"))
B = {b["id"]: b for b in T["beats"]}


def norm(s):
    return re.sub(r"[^a-zäöüß0-9]", "", s.lower())


def w(beat, word, nth=0, key="start"):
    b = B[beat]
    alts = word if isinstance(word, list) else [word]
    hits = [x for x in W if b["start"] - 0.3 <= x["start"] <= b["end"] + 0.2 and any(norm(x["w"]).startswith(norm(a)) for a in alts)]
    if len(hits) <= nth:
        raise SystemExit(f"Wort '{word}' nicht in {beat}: {[x['w'] for x in W if b['start'] - 0.2 <= x['start'] <= b['end'] + 0.2]}")
    return hits[nth][key]


r = lambda x: round(x, 2)
DUR = float(re.search(r'data-composition-id="main"[^>]*data-duration="([\d.]+)"', open(f"{V}/index.html", encoding="utf-8").read()).group(1))
st = lambda bid: B[bid]["start"]
C = {}
for k in range(1, 19):
    C[f"s{k}"] = r(st(f"b{k + 1}") - 0.08)
_b19 = [x for x in W if B["b19"]["start"] - 0.2 <= x["start"] <= B["b19"]["end"] + 0.2]
_k = next(i for i, x in enumerate(_b19) if norm(x["w"]).startswith("fehlt"))
C["s18b"] = r(_b19[_k - 1]["start"] - 0.08)  # Schnitt auf "Er fehlt bis heute."
C["end"] = r(st("b20") - 0.08)
C["hookHit"] = r(w("b1", "axt") + 0.04)
C["hookParts"] = [r(w("b1", "zwei")), r(w("b1", "eine")), r(w("b1", ["113", "hundert"]))]
C["gridCut"] = r(w("b4", "sägen"))
C["gridOut"] = r(w("b4", "durch"))
C["gridBack"] = r(w("b4", "setzen"))
C["fireBox"] = r(w("b6", "brennt"))
C["lightsOut"] = r(w("b7", "laternen") - 0.15)
C["entry"] = r(w("b8", "steigen"))
C["hits"] = [r(w("b9", "äxten") + 0.08), r(w("b9", "schlagen") + 0.08), r(w("b9", "löcher") + 0.05), r(w("b9", "vitrine") + 0.05)]
C["grabStart"] = r(w("b10", "erbeuten"))
C["grabEnd"] = r(B["b10"]["end"] - 0.15)
C["police"] = r(st("b12") + 0.05)
C["tooLate"] = r(st("b13") + 0.03)
C["powder"] = r(st("b13") + 0.1)
C["garageFire"] = r(w("b14", "zünden"))
C["spread"] = r(C["garageFire"] + 0.66)
C["raid"] = r(st("b16") + 0.05)
C["fade"] = r(w("b19", "heute"))
assert C["hookHit"] >= 1.0, f"hookHit {C['hookHit']} < 1.0: Axt wäre in Frame 0 nicht oben"
for a, b in zip(C["hits"], C["hits"][1:]):
    assert b - a >= 0.25, C["hits"]

DELTAS = [
    (r(w("b3", "alles")), r(st("b4") - 0.1)),
    (r(C["fireBox"] + 0.03), r(st("b7") - 0.1)),
    (r(C["lightsOut"] + 0.05), r(st("b8") - 0.15)),
    (r(C["police"]), r(st("b13") - 0.1)),
    (r(C["garageFire"] + 0.06), r(st("b15") - 0.1)),
    (r(C["raid"]), r(st("b17") - 0.1)),
    (r(st("b17") + 0.05), r(st("b18") - 0.1)),
    (r(st("b18") + 0.05), r(st("b19") - 0.1)),
    (r(C["s18b"] + 0.05), r(C["end"] - 0.05)),
]

# jede HUD-Zeile mindestens 1,9 s lesbar, ohne in die nächste zu laufen
DELTAS = [(a, max(b, min(a + 1.9, (DELTAS[i + 1][0] - 0.2) if i + 1 < len(DELTAS) else b))) for i, (a, b) in enumerate(DELTAS)]
DELTAS = [(a, round(b, 2)) for a, b in DELTAS]
html = open(f"{V}/index.html", encoding="utf-8").read()
order = [f"s{k}" for k in range(1, 19)] + ["s18b", "end", "hookHit", "hookParts", "gridCut", "gridOut", "gridBack", "fireBox",
                                           "lightsOut", "entry", "hits", "grabStart", "grabEnd", "police", "tooLate",
                                           "powder", "garageFire", "spread", "raid", "fade"]
items = [f'"{k}": {json.dumps(C[k])}' for k in order]
lines, cur = [], []
for it in items:
    cur.append(it)
    if len(", ".join(cur)) > 100:
        lines.append(", ".join(cur)); cur = []
if cur:
    lines.append(", ".join(cur))
block = '<script id="cues" type="application/json">\n      {\n        ' + ",\n        ".join(lines) + "\n      }\n    </script>"
html, n = re.subn(r'<script id="cues" type="application/json">.*?</script>', block, html, flags=re.S)
assert n == 1
deltas = iter(DELTAS)
def rep(m):
    a, b = next(deltas)
    return f'{m.group(1)}data-in="{a:.2f}" data-out="{b:.2f}"'
html, n = re.subn(r'(<div class="hud-delta[^"]*" )data-in="[\d.]+" data-out="[\d.]+"', rep, html)
assert n == len(DELTAS), n
open(f"{V}/index.html", "w", encoding="utf-8").write(html)

# ---------- Sound ----------
s = C
pops = [r(s["grabStart"] + i * (s["grabEnd"] - 0.25 - s["grabStart"]) / 11) for i in range(12)]
events = [
    {"type": "impact", "t": 0.0, "gain": -6},
    {"type": "heartbeat", "t": 0.05, "dur": r(s["hookHit"] - 0.1), "gain": -14},
    {"type": "riser", "t": r(max(0.05, s["hookHit"] - 0.9)), "dur": 0.85, "gain": -16},
    {"type": "impact", "t": s["hookHit"], "gain": -3},
    {"type": "glass", "t": r(s["hookHit"] + 0.02), "gain": -4},
    {"type": "alarm", "t": r(s["hookHit"] + 0.15), "dur": r(s["s2"] - s["hookHit"] - 0.25), "gain": -24},
    {"type": "impact", "t": s["s1"], "variant": "soft", "gain": -12},
    {"type": "clink", "t": [r(s["s1"] + 0.3), r(s["s1"] + 1.4), r(s["s1"] + 2.5)], "gain": -18},
    {"type": "rewind", "t": r(s["s2"] - 0.72), "dur": 0.7, "gain": -10},
    {"type": "impact", "t": s["s2"], "variant": "soft", "gain": -12},
    {"type": "birds", "t": r(s["s2"] + 0.1), "dur": r(s["s3"] - s["s2"] - 0.2), "gain": -24},
    {"type": "grinder", "t": s["gridCut"], "dur": r(min(1.3, s["gridOut"] - s["gridCut"] + 0.2)), "gain": -11},
    {"type": "clink", "t": [s["gridOut"], s["gridBack"] + 0.15], "gain": -12},
    {"type": "birds", "t": r(s["s4"] + 0.05), "dur": r(s["s5"] - s["s4"] - 0.1), "gain": -24},
    {"type": "impact", "t": s["s5"], "variant": "soft", "gain": -14},
    {"type": "zap", "t": r(s["fireBox"] - 0.07), "dur": 1.0, "gain": -10},
    {"type": "whoomp", "t": s["fireBox"], "gain": -10},
    {"type": "crackle", "t": r(s["fireBox"] + 0.08), "dur": 2.2, "gain": -18},
    {"type": "powerdown", "t": [s["lightsOut"], r(s["lightsOut"] + 0.4), r(s["lightsOut"] + 0.8)], "gain": -13},
    {"type": "steps", "t": r(s["s7"] + 0.02), "dur": r(s["s8"] - s["s7"] - 0.3), "rate": 2.2, "crowd": 2, "gain": -20},
    {"type": "impact", "t": s["s8"], "gain": -9},
    {"type": "glass", "t": s["hits"], "gain": -5},
    {"type": "alarm", "t": r(s["hits"][0] + 0.12), "dur": r(s["s11"] - s["hits"][0]), "gain": -24},
    {"type": "pop", "t": pops, "gain": -24},
    {"type": "cash", "t": s["grabEnd"], "gain": -16},
    {"type": "hum", "t": s["s10"], "dur": r(s["s11"] - s["s10"]), "gain": -24},
    {"type": "martinshorn", "t": r(s["s11"] + 0.01), "dur": r(s["s12"] - s["s11"]), "gain": -10},
    {"type": "impact", "t": s["s12"], "gain": -8},
    {"type": "ignite", "t": r(s["tooLate"] + 0.08), "gain": -14},
    {"type": "steps", "t": r(s["tooLate"] + 0.18), "dur": r(min(2.4, s["s13"] - s["tooLate"] - 0.3)), "rate": 3.4, "crowd": 2, "gain": -16},
    {"type": "whoomp", "t": [s["garageFire"], s["spread"], r(s["spread"] + 0.3)], "gain": -6},
    {"type": "crackle", "t": r(s["garageFire"] - 0.04), "dur": r(s["s14"] - s["garageFire"] + 0.05), "gain": -15},
    {"type": "impact", "t": r(w("b15", "verschwunden")), "variant": "soft", "gain": -16},
    {"type": "impact", "t": s["s15"], "gain": -10},
    {"type": "martinshorn", "t": r(s["raid"] - 0.1), "dur": r(s["s16"] - s["raid"]), "gain": -16},
    {"type": "steps", "t": r(s["raid"] + 0.14), "dur": r(s["s16"] - s["raid"] - 0.2), "rate": 6, "crowd": 4, "gain": -16},
    {"type": "riser", "t": r(s["s16"] - 1.45), "dur": 1.4, "gain": -18},
    {"type": "cash", "t": r(s["s16"] + 0.05), "gain": -14},
    {"type": "knock", "t": [r(s["s17"] + 0.2), r(s["s17"] + 0.8)], "gain": -6},
    {"type": "impact", "t": s["s18"], "variant": "soft", "gain": -12},
    {"type": "heartbeat", "t": r(s["s18"] + 0.1), "dur": r(s["s18b"] - s["s18"] - 0.1), "gain": -16},
    {"type": "impact", "t": s["s18b"], "gain": -9},
    {"type": "clink", "t": [r(s["s18b"] + 0.25), r(s["fade"])], "gain": -20},
    {"type": "riser", "t": r(s["end"] - 1.35), "dur": 1.3, "gain": -16},
    {"type": "impact", "t": s["end"], "gain": -8},
    {"type": "pop", "t": [r(s["end"] + 0.55 + i * 0.28) for i in range(4)], "gain": -16},
    {"type": "pop", "t": r(s["end"] + 1.85), "gain": -19},
]
sound = {
    "duration": DUR,
    "target_lufs": -22,
    "bed": [
        {"mood": "noir", "from": 0, "to": r(s["s14"] + 0.6), "gain": -16},
        {"mood": "tension", "from": r(s["s14"] - 0.2), "to": r(s["s18"] + 0.6), "gain": -17},
        {"mood": "wonder", "from": r(s["s18"] - 0.2), "to": DUR, "gain": -19},
    ],
    "bed_gain": [[0, -6], [r(s["hookHit"] - 0.05), -6], [r(s["hookHit"] + 0.1), 0],
                 [r(s["s4"] - 0.05), 0], [r(s["s4"] + 0.1), -9], [r(s["s5"] - 0.15), -9], [r(s["s5"] + 0.05), 0],
                 [r(s["s14"] - 0.05), 0], [r(s["s14"] + 0.05), -14], [r(s["s15"] - 0.3), -14], [s["s15"], 0], [DUR, 0]],
    "events": events,
}
json.dump(sound, open(f"{V}/sound.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(C))
print("deltas", DELTAS)
print("total VO", T["total"], "end", C["end"], "Dauer", DUR, "Endcard", round(DUR - C["end"], 2), "nach VO", round(DUR - T["total"], 2))
