"""Rundenplan: Schnittzahlen und Zeiten. Schreibt rounds.json und setzt Plan + Länge in index.html.

Aufruf (im Videoordner): python3 -I plan.py
Jede Runde: neue Zwiebel (kurz), das Messer schneidet von links nach rechts durch (Zähler läuft),
am Ende kurz halten. Die Serien steigen an, das Finale (1.000 Schnitte) bekommt Extrazeit.
"""
import json, math, re

SERIES = [
    [9, 15, 25, 36, 48],  # unter ~9 Schnitten wären die Stücke riesige Klötze
    [16, 38, 53, 76, 98],
    [37, 86, 125, 169, 218],
    [108, 198, 261, 351, 442],
    [197, 364, 500, 647, 814, 1000],
]
APPEAR, HOLD, FINAL_HOLD = 0.16, 0.42, 3.4

rounds, t = [], 0.0
for si, series in enumerate(SERIES):
    for n in series:
        dur = 1.45 + 0.36 * math.log10(n)          # mehr Schnitte = etwas länger
        final = n == SERIES[-1][-1]
        hold = FINAL_HOLD if final else HOLD
        cut0, cut1 = t + (APPEAR if rounds else 0.0), t + dur - HOLD  # erste Runde: sofort Action (Thumbnail)
        rounds.append({"n": n, "series": si, "t0": round(t, 3), "cut0": round(cut0, 3), "cut1": round(cut1, 3),
                       "t1": round(t + dur - HOLD + hold, 3), "final": final})
        t = t + dur - HOLD + hold
DUR = round(t, 2)
plan = {"duration": DUR, "rounds": rounds}
json.dump(plan, open("rounds.json", "w"), indent=1)

html = open("index.html", encoding="utf-8").read()
html = re.sub(r'<script id="rounds" type="application/json">.*?</script>',
              '<script id="rounds" type="application/json">' + json.dumps(plan) + "</script>", html, flags=re.S)
html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{DUR}"', html)
open("index.html", "w", encoding="utf-8").write(html)
print(f"{len(rounds)} Runden, Dauer {DUR} s")
