# Stil-Bibel: "Mal angenommen"-Videos

Abgeleitet aus drei Referenzvideos: ein deutsches 3D-Low-Poly-Video mit dem Kontostand-Zähler
(Billion-Euro-Video), ein englisches Kino-3D-Video mit dem Weltbevölkerungs-Zähler und ein deutsches
2D-Flat-Video im Erzählstil (Bunker). Standard ist **Stil A** (3D mit HUD-Zähler). Stil B nimmst du
nur, wenn der Nutzer ihn ausdrücklich will.

## 1. Bauplan (gilt für jedes Video)

| Phase | Zeit (bei 30 s) | Inhalt | Regeln |
|---|---|---|---|
| Hook | 0–3,5 s | "Mal angenommen … <Prämisse>." | ab Frame 0 groß in der Bildmitte, Serif, nicht kursiv. Das Bild zeigt sofort die Welt |
| Haken / Regel | 3,5–7 s | Die Einschränkung, die Druck macht ("Aber es gibt einen Haken …", "Keine Polizei, kein Notruf …") | HUD blendet ein |
| Startschuss | ~7 s | Ereignis, ab dem der Zähler läuft (Sirene, Countdown, Geldregen) | roter oder farbiger Flash, Stimmungswechsel der Welt |
| Eskalation | 7 s – 75 % | 4–6 Beats, je 1 Satz und 1 Bild, 2–3 s. Jeder Beat hat eine konkrete Zahl, ein konkretes Objekt oder eine Aktion | Steigerung im Maßstab ("Ach was, gleich das ganze Autohaus", "Du musst größer denken") |
| Twist | letztes Viertel | Persönlich, unheimlich oder emotional: ein Rückgriff auf den Anfang oder eine Wendung | ruhige Kamera, Push-in, Herzschlag |
| Auflösung | ~2 s | Schluss-Zustand des Zählers ("Um 7 Uhr ist alles vorbei", "… immer noch 850 Mrd. übrig") | Welt hellt auf, Zähler stoppt |
| Endcard | letzte 4–5 s | Frage an den Zuschauer, 3 Antwort-Pills plus gestrichelte "… oder etwas ganz anderes?", "SCHREIB ES IN DIE KOMMENTARE ↓" | Szene abgedunkelt, HUD auf 35 % |

Texten:
- Du-Form, Präsens, kurze Hauptsätze. Fragen und Ellipsen treiben das Tempo ("Klingt einfach.",
  "Das Problem?").
- Etwa 2,6 Wörter pro Sekunde. Kommas statt Punkte, wenn die TTS-Pausen zu lang werden.
- Jeder Satz muss sich als Bild zeigen lassen. Was man nicht zeigen kann, fliegt raus.
- Zahlen sollen plausibel und konkret sein. Fiktive Zähler sind Teil des Szenarios, aber erfinde
  keine echten Statistiken als Fakten.
- Das Ende ist eine offene Frage oder ein Dilemma, keine Zusammenfassung.

Zähler-Ideen (der Zähler ist das Wiedererkennungsmerkmal; die Unterzeile ist fast immer eine Restzeit):

| Szenario | Label | Zahl | Unterzeile |
|---|---|---|---|
| Geld in X Stunden ausgeben | DEIN KONTOSTAND | Euro, fällt | NOCH hh:mm:ss STUNDEN |
| keine Regeln / Purge | NOTRUFE OHNE ANTWORT | steigt | NOCH hh:mm:ss STUNDEN |
| Menschen verschwinden | WELTBEVÖLKERUNG | fällt | TAG / MONAT / JAHR |
| Stromausfall, Internet weg | HAUSHALTE OHNE STROM | steigt | TAG 1 18:40 |
| Zeitreise, Zeitraffer | JAHR | springt | Ort / Ereignis |

## 2. Look Stil A

**Welt:** Low-Poly, flache Farben (Lambert, `flatShading`), weiche Schatten, Nebel für Tiefe.
- Gras `#66ad44`, Straße `#53565c`, Gehweg `#d3d1c8`.
- Wände hell (`#ece6d8`, `#e2d5bd`, `#d3d1cc`), Dächer rot `#c4553b` oder grau `#8a909a`.
- Figuren sind Kapseln mit Kugelkopf.

**Stimmungen** (Keyframes, weich überblendet):

| Stimmung | Himmel oben → Horizont | Einsatz |
|---|---|---|
| dusk | `#5b6fae` → `#ffb27e` | Normalzustand, Abend |
| purge / night | `#0d0610` → `#8a1a2a`, roter Nebel | Bedrohung |
| dawn | `#6c88c6` → `#ffc7a0` | Auflösung |
| day (Geld/Luxus) | Blau → Weiß, Sonne hoch | positive Szenarien |

**Kamera:** Die Kamera fliegt ständig, und es gibt kaum harte Schnitte. Die Luftaufnahme am Anfang
zeigt oben noch Himmel. Pro Beat gibt es eine Einstellung. Weite Wege überbrückst du mit einem
Bogenflug (Lücke ≥ 0,2 s im `CameraRig`), kurze Wechsel mit einem harten Schnitt genau auf dem
Untertitelwechsel. Wirkungsvoll sind Kran hoch und runter, Push-in auf das Detail, ein Low Angle
nach oben bei Bedrohung und ein schneller Schwenk von A nach B. Bei Einschlägen wie Glas oder
Explosion folgt ein kurzer Kamera-Shake.

**Mengen sichtbar machen:** Wiederhole Objekte im Raster, zum Beispiel eines pro Sekunde. Gekaufte
oder betroffene Dinge bekommen eine Farbmarkierung (im Billion-Euro-Video wird Gekauftes grün und
durchsichtig). Partikel wie Scheine, Scherben oder Funken zeigen Ereignisse.

## 3. Typografie und Overlay (Pixel bei 1080x1920)

| Element | Position | Schrift |
|---|---|---|
| HUD-Label (z. B. "NOTRUFE OHNE ANTWORT", "DEIN KONTOSTAND") | links 64, oben 250 | Inter 600, 22 px, Sperrung 0,2em, Großbuchstaben |
| HUD-Zahl | darunter | Newsreader 500, 86 px, `tabular-nums` |
| HUD-Unterzeile ("NOCH 11:42:10 STUNDEN") | darunter | Inter 600, 17 px, Sperrung 0,22em, 78 % Weiß |
| Delta-Zeile | +186 px unter dem Label | Inter 600, 34 px, rot `#ff4d55` (Minus) bzw. grün `#6ee59a` (Plus); darunter Inter 500, 21 px, Beschriftung |
| Hook | oben 560, zentriert, max. 900 breit | Newsreader 400, 80 px, Zeilenhöhe 1,12 |
| Untertitel | oben 1110, zentriert, max. 880 breit | Newsreader *kursiv* 400, 58 px, weich verschattet |
| Endcard-Frage | Start oben 520 | Newsreader 500, 84 px |
| Pills | gestapelt, Abstand 26 | Newsreader kursiv, 46 px, Rand 2 px Weiß 72 %, Füllung Weiß 10 %, `border-radius: 999px`; letzte Pill gestrichelt rot `#ff5a6a` mit roter Füllung |
| Aufruf | unter den Pills | Inter 600, 23 px, Sperrung 0,24em, plus Pfeil ↓ (wippt) |

- Schatten auf jedem Text: `0 2px 6px rgba(0,0,0,.5), 0 4px 28px rgba(0,0,0,.45)`.
- Leichte Vignette, nachts stärker.
- Kein eigenes Wasserzeichen: TikTok-Logo und Abspann kommen von TikTok selbst.

Untertitel: Einblenden mit Fade in 0,2 s und 14 px Hochgleiten, Ausblenden in 0,16 s. Die Wechsel
sitzen auf den Satzanfängen aus `timing.json`, `captions.py` erledigt das.

## 4. Ton

- **Stimme:** männlich, ruhig, dokumentarisch, Standard `de-DE-ConradNeural`, `rate` +4 bis +10 %.
  `de-DE-FlorianMultilingualNeural` klingt heller und energischer, `de-DE-KillianNeural` ist eine
  Alternative.
- **Klangteppich:** leiser Synth-Pad im Hintergrund, der Stimmung folgend, unter der Stimme
  abgesenkt (Ducking).
- **Effekte:** auf jedem Schlüsselereignis, zum Beispiel ein Impact auf dem Hook-Frame, Whoosh auf
  Kamerafahrten, Sirene, Glas, Herzschlag im Twist und Vögel bei der Auflösung.
- **Lautheit:** Stimme −16 LUFS, Sounddesign ca. −22 LUFS, Summe ca. −14 LUFS.

## 5. Stil B (nur auf Wunsch): 2D-Flat-Erzählung

Stil B arbeitet mit einer Hauptfigur mit Namen, warmen Sonnenuntergangsfarben (Orange, Braun, Rot)
und flachen Vektorflächen. Untertitel stehen Wort für Wort in fetten, schmalen Großbuchstaben
(Oswald-artig) im dunklen Kasten, Schlüsselwörter gelb oder rot und unterstrichen. Dazu kommen
schräge Etiketten ("15 MIN > JEDE STRASSE"), Infografiken auf Notizzetteln, eine Uhr oben
("☀ TAG 1 | 18:40") und am Ende "Teil 2"/"Folge für Teil 2". Umsetzung: SVG und GSAP statt
three.js. Die Wortzeiten für die Karaoke-Untertitel liefert Whisper.
