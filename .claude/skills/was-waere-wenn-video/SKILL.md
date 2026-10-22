---
name: was-waere-wenn-video
description: Erstellt fertige TikTok-Videos (MP4, 1080x1920) als 3D-Low-Poly-Geschichten mit laufendem Zähler, komplett im Code mit HyperFrames und three.js. Immer auf Deutsch. Hauptformat "Echte Raubzüge" (reale Coups recherchiert und Minute für Minute nachgestellt), außerdem "Mal angenommen / Was wäre wenn". Benutzen, sobald der Nutzer ein neues Video, einen Fall, ein Szenario oder eine Änderung an einem bestehenden Video in diesem Repo möchte ("mach ein Video über den Raub …", "nächster Fall", "was wäre wenn …", "neues TikTok", "60-Sekunden-Video").
---

# 3D-Story-Videos: „Echte Raubzüge“ und „Mal angenommen“

**Formate:**
- **B – Echte Raubzüge** ist das Hauptformat und der Standard, wenn der Nutzer nichts anderes sagt:
  ein realer Coup, recherchiert, mit Quellen belegt und nachgestellt. Referenz:
  `videos/02-gruenes-gewoelbe/`. Fallideen stehen in `references/fallideen.md`.
- **A – Mal angenommen** ist ein hypothetisches Szenario. Referenz: `videos/01-keine-regeln/`.

Jedes Video ist ein HyperFrames-Projekt unter `videos/NN-<slug>/`. Die 3D-Welt läuft in three.js über den
HyperFrames-`three`-Adapter (`hf-seek`), HUD, Untertitel und Endcard sind HTML und GSAP. Stimme, Musik
und Effekte werden per Skript erzeugt. Die Ausgabe ist ein fertiges MP4.

**Sprache: immer Deutsch.** Voiceover, Untertitel, HUD, Endcard, Dateinamen-Slugs (ohne Umlaute) und
die Antwort an den Nutzer sind Deutsch. Das gilt auch dann, wenn das Thema aus dem Englischen kommt.
Zahlen schreibst du deutsch (`1.284.551`, `21,7 Mrd. €`, `7 Uhr`). Für die Stimme schreibst du
schwierige Zahlen im Feld `say` aus ("neunzehn Uhr").

Lies vor dem ersten Video der Session `references/stil-bibel.md` für Aufbau, Look und Typografie und
`references/technik.md` für die HyperFrames-Fallstricke und die Umgebung. Ist das Plugin
`hyperframes@hyperframes` installiert, nutze seine Skills `hyperframes-core` (Kompositionsvertrag),
`hyperframes-animation` (Adapter `three`, GSAP) und `hyperframes-cli` (Render-Flags) für API-Details.
Dieser Skill hier geht vor, wenn es um Stil, Sprache und Ablauf geht. Das vollständige
Referenzbeispiel ist `videos/01-keine-regeln/`: Szene, HUD, Sound und Endcard sind dort fertig gebaut.

## Ablauf

0. **Nur Format B: Recherche.** Recherchiere den Fall (WebSearch/WebFetch) und lege `quellen.md`
   an, siehe Stil-Bibel Abschnitt 6. Ins Video kommt nichts ohne Beleg. Nenne keine Täternamen.
1. **Thema → Skript** (`script.json`). Nutze den Bauplan aus der Stil-Bibel: Hook, Haken, laufender
   Zähler, Eskalation (ein Satz = ein Bild, 2–3 s), Twist, Endfrage. Zielwerte: ca. 2,3–2,6 Wörter pro
   Sekunde. Bei 30 s sind das ca. 70 Wörter Voiceover plus 2 s Endcard, bei 60 s ca. 135 Wörter
   plus 4–5 s Endcard. Lege den HUD-Zähler fest: Was zählt mit, und in welche Richtung? Erzähle
   **spannend**, nicht nachrichtlich. Die Regeln dafür stehen in der Stil-Bibel, Abschnitt 4
   (Segmente, Pausen vor Enthüllungen, Tempo pro Satz).
2. **Projekt anlegen:** `bash .claude/skills/was-waere-wenn-video/scripts/new_video.sh <slug>`. Das
   kopiert die Vorlage, three.js, GSAP und die Schriften.
3. **Voiceover:** `python3 -I .claude/skills/was-waere-wenn-video/scripts/tts.py videos/NN-slug`.
   Standard ist Chatterbox mit der Stimme Thorsten, sehr emotional (einmal pro Container vorher
   `scripts/setup_chatterbox.sh`; ca. 25–30 min für 60 s, im Hintergrund laufen lassen). Das erzeugt
   `assets/audio/voiceover.wav` (−16 LUFS) und `timing.json` mit Start/Ende je Beat. Prüfe die mit
   `<-- prüfen!` markierten Segmente. Ist die Länge falsch, kürzt du Text und Pausen oder setzt
   `speed`. Laufe nicht weiter, bevor die Länge passt.
4. **Untertitel einsetzen:** `python3 -I .claude/skills/was-waere-wenn-video/scripts/captions.py videos/NN-slug`.
   Das schreibt den Hook und die Untertitel aus `timing.json` in `index.html`.
5. **Cues und Szene:** Leite die Sync-Punkte (`#cues` in `index.html`) aus den Wortzeiten ab:
   `python3 -I .claude/skills/was-waere-wenn-video/scripts/words.py videos/NN-slug`. Baue die Welt
   in `assets/scene.js` mit `assets/lowpoly-kit.js`: Stimmungs-Keyframes, Objekte, `CameraRig`-Shots
   (ein Shot pro Beat, Schnitt auf dem Untertitelwechsel). HUD-Zähler und Delta-Zeilen gehören dazu.
6. **Sounddesign:** Erstelle `sound.json` (Klangteppich-Stimmungen und Effekte auf den Cues) und
   führe `python3 -I .claude/skills/was-waere-wenn-video/scripts/sounddesign.py videos/NN-slug` aus.
7. **Prüfen mit Standbildern:** `npx hyperframes snapshot --at <Mitte jedes Beats>` im Videoordner,
   dann das Kontaktbild ansehen. Behebe alles aus der QA-Liste unten. Wiederhole das, bis jeder
   Shot sauber ist.
8. **Rendern:** `bash .claude/skills/was-waere-wenn-video/scripts/render.sh videos/NN-slug`. Das
   Skript führt Check und Render aus und meldet die Lautheit. Danach prüfst du Frames aus dem MP4 und
   schickst dem Nutzer das MP4 mit `SendUserFile`.

## QA-Liste (vor dem Abgeben, jeder Punkt)

- Der Hook steht ab Frame 0 groß im Bild, denn Frame 0 ist das Thumbnail.
- Kein Objekt (Laterne, Auto, Mast, Hauswand) steht zwischen Kamera und Motiv. Prüfe jeden Shot am
  Anfang, in der Mitte und am Ende.
- Das Motiv jedes Beats ist im Bild, *während* der Satz dazu gesprochen wird (Polizei bei "Polizei",
  Glas bei "Glas").
- Der HUD-Zähler läuft plausibel und endet auf der Schlusszahl. Delta-Zeilen erscheinen auf ihren
  Ereignissen.
- Text liegt nie über Text. Untertitel bleiben im Bereich y ≈ 1100–1350, rechts frei für die
  TikTok-Buttons.
- Figuren und Symbole wirken nicht wie UI-Icons, zum Beispiel ein Profilbild-Platzhalter: Details
  wie Rahmen, Vorhang und Asymmetrie hinzufügen.
- Voiceover per Whisper (Modell `medium`) gegenprüfen. Wird ein Wort falsch erkannt, formulierst du
  es um (siehe Technik: Aussprache). Die Gesamtmischung liegt bei ca. −14 LUFS und übersteuert nicht.
- Menschen sind echte Figuren (`makeCharacter`), keine Kapseln. In Nahaufnahmen müssen Gesicht bzw.
  Maske klar erkennbar sein. Jede Figur, die im Text vorkommt (Läufer, Klopfer, Nachbar), ist im
  Bild, während über sie gesprochen wird.
- Die Endcard zeigt Frage, 3 Antwort-Pills plus eine gestrichelte rote "… oder etwas ganz
  anderes?"-Pill und darunter "SCHREIB ES IN DIE KOMMENTARE ↓" (Format B: "SCHREIB DEINE THEORIE
  IN DIE KOMMENTARE").
- Format B: Jede Aussage steht in `quellen.md`. Im HUD steht "REKONSTRUKTION". Täter bleiben
  gesichtslos und ohne Namen.

## Wiederverwendbare Teile

| Datei | Zweck |
|---|---|
| `template/index.html` | Komposition 1080x1920: Canvas, HUD, Untertitel-Marker, Endcard, GSAP-Timeline |
| `template/assets/lowpoly-kit.js` | Himmel-Shader, Stimmungs-Keyframes, instanzierte Häuser mit Fenstern/Rollläden, Bäume, **Menschen mit Gelenken** (`makeCharacter` + `animateCharacter`: gehen, rennen, ducken, klopfen, winken, Fackel/Taschenlampe halten, Axthieb `chop`, Greifen `reach`; Purge-Maske, Kapuze, Frisuren), `pathAt` für Laufwege, Drehkörper `lathe` (Kuppeln, Turmhauben), `makeBrilliant`, `makeJewel`, Feuer, Rauch, Glow-Sprites, Schild-Texturen, `CameraRig`, deutsche Zahlformate |
| `template/assets/scene.js` | Startgerüst einer Szene |
| `scripts/tts.py` | Chatterbox (Standard: Thorsten, `exaggeration`/`cfg` pro Beat/Segment, Kandidaten mit Whisper-Auswahl) oder edge-tts; `voice_fx: cinematic`, Pausen, Stille getrimmt, LUFS-normalisiert |
| `scripts/words.py` | Wortzeitstempel des Voiceovers (Whisper) für Cues |
| `assets/voices/` | Stimmvorlagen (Thorsten, CC0) |
| `scripts/captions.py` | Hook und Untertitel aus `timing.json` in `index.html` schreiben |
| `scripts/sounddesign.py` | synthetischer Klangteppich (dusk/night/tension/dawn/wonder) mit Lautstärke-Automation (`bed_gain`) plus Effekte (u. a. Sirene, Glas, Klopfen, Zünden, Feuer-Wumms, Schritte, Herzschlag), Ducking unter der Stimme |
| `scripts/new_video.sh`, `scripts/render.sh` | Projekt anlegen bzw. prüfen, rendern, Lautheit messen |

Wenn ein Video ein neues Bauteil braucht (Fahrzeug, Gebäude, Effekt, Sound), baust du es so, dass es
wiederverwendbar ist. Dann ergänzt du es in `lowpoly-kit.js` bzw. `sounddesign.py` und kopierst die
Kit-Datei in die Vorlage zurück.
