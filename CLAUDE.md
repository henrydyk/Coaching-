# TikTok-Videos (deutsch) – Projektnotizen

Alle Videos entstehen mit dem Skill `.claude/skills/was-waere-wenn-video/` (HyperFrames + three.js,
Stimme, Sounddesign, Render). Antworten an den Nutzer immer auf Deutsch, kurz und ohne Fachjargon.
Der Nutzer will **schnell** fertige Videos und schickt keine Rückfragen-Runden: Entscheidungen selbst
treffen, Voiceover sofort im Hintergrund starten, parallel die Szene bauen, einmal prüfen, rendern,
MP4 per `SendUserFile` schicken, committen und pushen.

## Stimme: Entscheidung des Nutzers (aktuell)

Der Nutzer hat **ElevenLabs** gewählt. Alle lokalen Stimmen haben ihn gestört:
- Microsoft (Florian, Conrad): langweilig.
- Chatterbox/Thorsten: „Akzent / englisch“, „klingt künstlich“, „zu langweilig“, „zu langsam“.
  Satz für Satz erzeugt klang es zusätzlich „abgehackt“ (deshalb `flow`).

Sobald `ELEVENLABS_API_KEY` in der Umgebung gesetzt ist (prüfen, ohne den Wert auszugeben):
1. `python3 -I .claude/skills/was-waere-wenn-video/scripts/el_voices.py list` und 3–4 **deutsche
   Muttersprachler** mit Erzähler-Stil wählen (männlich, tief, dramatisch/Storytelling; keine
   vorgefertigten englischen Stimmen wie Roger/Sarah, die haben wieder Akzent).
2. Hörproben mit dem Hook: `el_voices.py sample renders/stimmen <owner_id>:<voice_id> …`, dem Nutzer
   schicken, er wählt eine.
3. In `script.json`: `"engine": "elevenlabs"`, `"voice_id": "<gewählt>"`, `"el_model": "auto"` (neuestes Modell; laut Nutzer-Dashboard gibt es seit Okt. 2026 „Eleven v4“),
   `"stability": 0.5`, `"flow": 240`, `"tempo": 1.0`. Spannung über Audio-Tags im `say`-Text (v3/v4)
   (`[whispers]`, `[nervous]`, `[dramatic]`), aber sparsam. Kein `exaggeration`/`cfg` (nur Chatterbox).
4. `tts.py` → `words.py` → `python3 -I cues.py` (im Videoordner) → `captions.py` → `sounddesign.py` →
   Snapshot-Kontrolle → `render.sh`. Mit ElevenLabs dauert die Stimme unter 1 Minute.

Lizenz: Gratis-Plan nur nicht-kommerziell. Für monetarisierte Videos muss das Audio in einem bezahlten
Abo erzeugt werden. Das dem Nutzer einmal sagen, nicht bei jedem Video.

## Offene Aufgabe

`videos/03-haus-13-teil-1/` („Haus Nr. 13“, Gruselserie Teil 1) ist fertig gebaut und die Bugs aus dem
ersten Render sind behoben (Arm, Hände, gesichtslose Gestalten, Haus 13 am Tag, Wecker, Flur,
HUD-Überlappung). Es fehlt nur die neue Stimme: ElevenLabs wie oben, dann neu rendern und schicken.
Danach Teil 2 nach `videos/serie-haus-13.md` (Szene aus Teil 1 kopieren).
