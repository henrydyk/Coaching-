# Technik: HyperFrames, three.js, Audio, Umgebung

## Einrichtung (einmal pro Session/Container)

```bash
npm install                                   # hyperframes, three, gsap, @fontsource/* aus package.json
pip install -q edge-tts faster-whisper scipy  # Stimme, Transkription, Audio-Filter
export HYPERFRAMES_BROWSER_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)
```

- Die offiziellen HyperFrames-Skills installierst du als Plugin (Nutzer-Scope, gilt ab der nächsten
  Sitzung): `claude plugin marketplace add heygen-com/hyperframes && claude plugin install hyperframes@hyperframes`.
  Der Hinweis auf Git-LFS-Platzhalter betrifft nur Testdaten des Repos, ein `lfs pull` ist nicht nötig.
- HyperFrames sucht den Browser über `HYPERFRAMES_BROWSER_PATH`. `render.sh` setzt die Variable
  automatisch. Ohne sie meldet `doctor` "Chrome Headless Shell is required".
- Der Session-Proxy terminiert TLS neu. `edge-tts` nutzt hart `certifi`, deshalb biegt `tts.py`
  `certifi.where()` auf `/root/.ccr/ca-bundle.crt` um. TLS-Prüfung niemals abschalten.
- Die eingebaute HyperFrames-TTS (Kokoro) kann **kein Deutsch**. Deshalb nutzen wir Chatterbox
  (Standard) bzw. edge-tts (schneller Entwurf).

## Stimme: ElevenLabs (wenn ELEVENLABS_API_KEY gesetzt ist)

Der Nutzer fand Chatterbox/Thorsten zu englisch klingend („komischer Akzent“). ElevenLabs mit einer
**deutschen Muttersprachler-Stimme** aus der Voice Library behebt das. Die vorgefertigten Stimmen
(Roger, Sarah …) sind englische Sprecher und haben denselben Akzent-Effekt, also nicht nehmen.

- Schlüssel nur als Umgebungsvariable `ELEVENLABS_API_KEY` (Umgebungseinstellungen → Network secrets),
  nie in Dateien oder im Chat. Der Nutzer legt ihn an, eine neue Sitzung übernimmt ihn.
- Stimme finden: `python3 -I scripts/el_voices.py list` (deutsche Erzähler, mit kostenlosen Vorschau-MP3s),
  dann `python3 -I scripts/el_voices.py sample <ordner> <owner_id>:<voice_id> …` für Hörproben mit dem Hook.
- `script.json`: `"engine": "elevenlabs"`, `"voice_id"`, `"el_model": "eleven_v3"`, `"stability"`
  (v3: 0.0 kreativ / 0.5 natürlich / 1.0 stabil), optional `"style"`, `"el_speed"`. Emotion bei v3 über
  Audio-Tags im `say`-Text: `[whispers]`, `[dramatic]`, `[excited]`, `[sighs]`. Whisper ignoriert die
  Tags beim Abgleich, die Untertitel kommen ohnehin aus `caption`.
- Ca. 1 Credit pro Zeichen: ein 60-s-Skript ≈ 900–1.000 Zeichen plus Wiederholungen. Dauer: unter 1 min.
- **Lizenz:** Gratis-Plan = nicht kommerziell. Für monetarisierte Videos muss das Audio in einem
  bezahlten Abo (ab Starter) erzeugt werden. Audio aus der Gratis-Zeit wird nicht nachträglich kommerziell.

## Stimme: Chatterbox (Standard)

```bash
bash .claude/skills/was-waere-wenn-video/scripts/setup_chatterbox.sh   # einmal pro Container, ca. 5 min
```

- Das legt `.venv-chatterbox/` an (torch CPU + `chatterbox-tts`, MIT). Beim ersten Lauf lädt der
  Worker das Modell von HuggingFace (ca. 3 GB).
- `tts.py` startet `scripts/chatterbox_worker.py`. Der Worker lädt das Modell einmal (ca. 45 s), wertet
  die Stimmvorlage einmal aus und verteilt die Segmente per `fork` auf 4 Prozesse mit je 1 Thread
  (Gewichte geteilt, ca. 6 GB RAM gesamt). Gemessen: ca. 70–80 s pro Segment und Prozess, also ca.
  18 s pro Segment bei 4 Kernen. Ein 60-s-Skript (ca. 26 Segmente) ist in ca. 8–10 min fertig.
  Ein Prozess mit 4 Threads war nur halb so schnell (OpenMP wartet bei den kleinen Schritten aktiv).
- **Reihenfolge für Tempo:** Skript fertig → Voiceover sofort im Hintergrund starten → in der Zeit
  Szene bauen. Die Cues hängen an den Wortzeiten, deshalb wartet nur der Feinschliff auf die Stimme.
- Fertige Segmente liegen in `.tts-cache/` (Schlüssel aus Text und Regie). Ändere einen Satz, wird nur
  dieser neu erzeugt.
- Bei hoher `exaggeration` erfindet Chatterbox manchmal Silben am Satzende oder verschluckt Wörter.
  Deshalb prüft Whisper (`asr_model`, Standard `medium`, greedy) jede Aufnahme. Nur Segmente unter 0.9
  oder mit auffälliger Länge bekommen einen weiteren Seed (bis `candidates`, Standard 3). Werte unter
  0.85 markiert das Skript mit `<-- prüfen!`.
- **Kurze Einzel-Segmente vermeiden:** „Dresden.“ allein bekam angehängtes Gebrabbel, „Fehlt bis heute.“
  klang wie „Wendt bis heute“. Mit Kontext klappt es: „Dresden. Alles beginnt Tage vorher.“ als ein
  Segment, „Er fehlt bis heute.“
- **Thorsten emotional spricht langsam** (ca. 1,75 Wörter/s, viele Atempausen). Für die Länge gibt es
  `max_pause` (z. B. 0.22: Pausen in den Aufnahmen kürzen) und `tempo` (z. B. 1.15: ganzes Voiceover
  per atempo). Beides wirkt nur beim Zusammensetzen, ohne Neugenerieren. Rechne mit ca. 63 s Stimme
  für 135 Wörter, also Videos um 64–66 s. Über 1 Minute ist auf TikTok ohnehin Pflicht für das
  Creator Rewards Program.
- Die Stimmvorlage (`voice_ref`) ist eine 10–15 s lange, saubere Aufnahme. Thorsten-Voice ist CC0 und
  darf kommerziell genutzt werden. Klone nie die Stimme einer realen Person ohne deren Erlaubnis.
- Wortzeitstempel für die Cues: `python3 -I .claude/skills/was-waere-wenn-video/scripts/words.py videos/NN-slug`
  (schreibt `words.json`).
- Wortzeitstempel für Cues bekommst du per Whisper. Das Modell "small" lädt beim ersten Mal von
  HuggingFace:

```python
import subprocess, numpy as np
from faster_whisper import WhisperModel
raw = subprocess.run(["ffmpeg","-v","error","-i","assets/audio/voiceover.wav","-ac","1","-ar","16000","-f","s16le","-"],capture_output=True).stdout
a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768   # Array übergeben: das PyAV-Dateiöffnen ist hier kaputt
for s in WhisperModel("small", device="cpu", compute_type="int8").transcribe(a, language="de", word_timestamps=True)[0]:
    print(" ".join(f"{w.word.strip()}@{w.start:.2f}" for w in s.words))
```

Whisper verhört sich bei TTS manchmal ("Fabare kadieren"). Für Timing reicht das. Für die
Aussprache-Prüfung nimmst du das Modell `medium`. Erkennt auch `medium` ein Wort mehrfach falsch,
formulierst du es um. Bei Florian erprobt:
- „Dreimal.“ → `say: "Drei Mal."`
- „Du wartest.“ → „Und wartest.“
- „Würdest du aufmachen?“ → „Würdest du die Tür aufmachen?“

Kurze Einzelwörter und Fragen ohne Kontext werden am häufigsten verschluckt.

**Achtung, Multilingual-Stimmen kippen die Sprache:** Florian ist eine Multilingual-Stimme und rät die
Sprache pro Segment. Kurze Segmente mit Zahlwörtern („Einundzwanzig Schmuckstücke.“) wurden auf
Englisch gesprochen („Einen Swansick Schmackstack“). Abhilfe:
- vollständige Sätze mit deutschem Kontext („Sie erbeuten einundzwanzig Schmuckstücke mit …“),
- keine Segmente, die nur aus Zahlwörtern bestehen,
- danach immer mit Whisper `medium` gegenprüfen.

**Stolperfalle `ffmpeg` in Schleifen:** `ffmpeg` liest stdin und frisst dann in `while read`-Schleifen
die nächsten Zeichen. Nimm dort immer `ffmpeg -nostdin …` bzw. in Python `stdin=subprocess.DEVNULL`.
Die Skripte machen das bereits.

## HyperFrames-Vertrag (was hier zählt)

- Die Root ist `<div id="root" data-composition-id="main" data-width="1080" data-height="1920"
  data-duration="<s>">`. **`data-duration` ist Pflicht**, weil der three-Adapter keine Dauer ableitet.
- Es gibt genau eine pausierte GSAP-Timeline: `window.__timelines["main"] = tl`. Registriere sie
  erst nach dem Aufbau.
- three.js rendert nur in `hf-seek` (`event.detail.time`), nie per `requestAnimationFrame`.
  Aufwendigen Aufbau (Schriften für Canvas-Texturen) hängst du an `window.__hf.buildReady.world`.
- Kein `Math.random()`, `Date.now()` und kein Netz zur Renderzeit. Nutze `mulberry32(seed)` aus dem
  Kit. Alle Libs und Schriften liegen lokal in `assets/vendor` bzw. `assets/fonts`, jede Schrift mit
  `@font-face`.
- `<audio>` braucht eine `id`, sonst bleibt der Render stumm. Kein `crossorigin`.
- Tweens laufen nie auf `.clip`-Elementen mit `visibility`/`autoAlpha`. Opacity animierst du an
  Kind-Elementen.
- Die Lint-Warnung `nested_structure_needs_subcomposition` betrifft nur die Studio-Ansicht und ist
  für den Render unkritisch.
- Befehle im Videoordner: `npx hyperframes lint | check | snapshot --at 1,5,9 | render --output renders/x.mp4`.
  Ein Snapshot mit 7 Frames dauert ca. 12 s. Ein Render von 30 s bei 30 fps dauert einige Minuten
  (Software-WebGL).

## three.js-Erfahrungen

- Gerendert wird mit Software-WebGL. Instanziere viele gleiche Objekte (`InstancedMesh`). Ein paar
  hundert Häuser plus Fenster laufen flüssig.
- Fenster sind `MeshBasicMaterial` (leuchten unabhängig vom Licht), Glows sind additive Sprites.
  Echte `PointLight`s setzt du sparsam ein (≤ 5).
- Das Schatten-Frustum folgt dem Kamera-Ziel (`applyMood(..., { focus })`), sonst fehlen Schatten
  in entfernten Shots.
- Die Kamera kann im Haus starten: Häuser stehen bei x = ±13 mit 8 m Tiefe, die Straße ist ±5,
  Gehwege bis ±8. Prüfe Kamerapositionen gegen die Hausboxen.
- Laternen und Autos haben anfangs Motive verdeckt. Halte Sichtachsen frei, indem du Objekte im
  Bereich eines Shots auslässt oder versetzt.
- Bei harten Schnitten dürfen Objekte, die nur in einem Shot sichtbar sein sollen, genau auf der
  Schnittzeit umschalten, zum Beispiel `visible = t >= C.purgersIn`.
- Blick von innen nach außen (Türspion): Die Kamera steht in der Hausbox. Deren Flächen werden von
  innen weggeculled, doppelseitige Teile wie Türblatt und Rollläden aber nicht. Das Türblatt
  blendest du in dem Shot aus (Instanz auf Skala 0). Der runde Ausschnitt ist ein CSS-Overlay
  (`#peephole`) mit `fov: 100`.
- Ändere während eines laufenden Renders keine Dateien im Videoordner.
- Mehrere Schauplätze in einem Video: Baue jeden als eigene `THREE.Group` an einem weit entfernten
  Ort (z. B. x = ±800) und schalte `group.visible` nur in seinen Shots ein. Die Stimmung schaltest du
  hart pro Shot (Liste `[Startzeit, Stimmung, Himmel an?]`), nicht weich überblendet.
- Kamerafahrten an Gebäuden: Laternenmasten in der Sichtachse vermeiden. Die Kamera gerade auf das
  Motiv richten, wenn Laternen im Raster stehen.
- Laufzeit: ca. 0,6–1,5 s pro Frame mit Software-WebGL, also ca. 20–25 min für 60 s. **Mehr Worker
  helfen nicht:** gemessen 1 Worker = 4 Worker (77 vs. 78 Frames nach 128 s), weil SwiftShader schon
  alle Kerne nutzt. `render.sh` nimmt deshalb 1 Worker. Teuer sind Innenräume mit vielen Lichtern,
  Glas-Splittern und Glows. Lichter mit Intensität 0 auf `visible = false` setzen spart Rechenzeit
  (Ergebnis identisch).
