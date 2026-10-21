# Stil-Bibel: 3D-Story-Videos (Format A „Mal angenommen“, Format B „Echte Raubzüge“)

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

## 4. Ton und Erzählweise

**Stimme:** Standard ist `de-DE-FlorianMultilingualNeural` mit `voice_fx: "cinematic"` (Wärme,
Präsenz, Kompression, kleiner Raum), `rate` +4 %, `pitch` −2 Hz. Florian liegt mit ca. 126 Hz nah am
Erzähler der Bunker-Referenz (129 Hz) und klingt erzählerischer als `de-DE-ConradNeural`, der ruhig
und eher nachrichtlich wirkt. Conrad ist die Alternative für ruhige oder dokumentarische Themen.

**Spannend erzählen statt vorlesen.** Der Nutzer will Spannung, deshalb bekommt jeder Beat eine Regie:
- Teile Sätze in `say`-Segmente und setze **Pausen vor die Enthüllung**:
  `["Um drei Uhr nachts …" (gap 0.45), "klopft es an deiner Tür."]`.
- Das Tempo folgt der Handlung: Action-Sätze schnell (`rate` +10 bis +14 %), unheimliche Sätze
  langsam und tiefer (`rate` −8 bis −14 %, `pitch` −4 Hz), Flüster-Momente leiser (`volume` −10 %).
- Stakkato in kurzen Segmenten mit kleinen Lücken (0,12–0,15 s): „Keine Polizei. | Kein Notruf. |
  Keine Strafe.“
- Ein-Wort-Sätze als eigener Beat mit langer Pause davor („Drei Mal.“), Geräusch in die Pause legen
  (Klopfen).
- Echte Stille ist ein Effekt: Der Klangteppich fällt per `bed_gain` für 1–2 s weg („Dann … Stille.“).
- Uhrzeiten geben bei langen Videos Struktur („Um halb acht …“, „Um Mitternacht …“, „Um 3 Uhr …“).
  Der HUD-Countdown läuft dann stückweise genau auf diese Uhrzeiten.
- Der Twist zahlt sich im Bild aus: Ein Detail aus dem Twist taucht früher schon auf (gleiche Jacke
  beim Klopfer und beim Nachbarn).

**Klangteppich:** leiser Synth-Pad, der Stimmung folgend, unter der Stimme abgesenkt (Ducking).

**Effekte:** auf jedem Schlüsselereignis, zum Beispiel Impact auf dem Hook-Frame und auf harten
Schnitten, Whoosh auf Kamerafahrten, Sirene, Glas, Zünden, Feuer-Wumms, Schritte, Klopfen,
Herzschlag im Twist, Vögel bei der Auflösung, Pops für die Pills.

**Lautheit:** Stimme −16 LUFS, Sounddesign ca. −22 LUFS, Summe ca. −14 LUFS.

## 4b. Menschen

- Nutze immer `makeCharacter` mit Kleidung, Hautton, Frisur (short/long/bald/cap) und Animation über
  `animateCharacter`, nie Kapseln.
- Bösewichte bekommen Kapuze und Maske (`mask: true, hood: true`), dunkle Kleidung und eine Fackel
  als Lichtquelle (`PointLight` in der Hand).
- In Nahaufnahmen (Maske, Gesicht) koppelt der Schatten-Ausschnitt automatisch an den Kameraabstand,
  so bleibt der Schatten scharf.
- Jede Figur hat einen klaren Laufweg (`pathAt`) und ist nur in ihren Shots sichtbar. Das spart
  Renderzeit.
- Vor der Szene testest du neue Figuren und Posen in einer Mini-Komposition (Kontaktbild), erst dann
  baust du sie ein.

## 5. Stil B (nur auf Wunsch): 2D-Flat-Erzählung

Stil B arbeitet mit einer Hauptfigur mit Namen, warmen Sonnenuntergangsfarben (Orange, Braun, Rot)
und flachen Vektorflächen. Untertitel stehen Wort für Wort in fetten, schmalen Großbuchstaben
(Oswald-artig) im dunklen Kasten, Schlüsselwörter gelb oder rot und unterstrichen. Dazu kommen
schräge Etiketten ("15 MIN > JEDE STRASSE"), Infografiken auf Notizzetteln, eine Uhr oben
("☀ TAG 1 | 18:40") und am Ende "Teil 2"/"Folge für Teil 2". Umsetzung: SVG und GSAP statt
three.js. Die Wortzeiten für die Karaoke-Untertitel liefert Whisper.


## 6. Format B: Echte Raubzüge (Hauptnische des Kanals)

Reale Coups werden in der Low-Poly-Welt Schritt für Schritt nachgestellt. Referenz:
`videos/02-gruenes-gewoelbe/`.

**Pflicht vor dem Skript:** Recherchiere den Fall mit Quellen (WebSearch/WebFetch) und lege
`quellen.md` im Videoordner an: Tabelle „Aussage im Video → Beleg-URL“. Ins Video kommt nur, was dort
belegt ist. Unklare Details (genaue Minuten, Zahl der Schläge, Gesichter) behauptest du nicht, das
Bild bleibt dann allgemein. Prüfe den aktuellen Stand offener Punkte („fehlt bis heute“) mit einer
frischen Suche und nenne dem Nutzer das Datum der jüngsten Quelle. **Keine Namen** von Tätern oder
Privatpersonen nennen, keine Verherrlichung. Die Täter sind gesichtslos (Kapuze, Sturmhaube).

**Bauplan (60 s, ca. 135 Wörter):**

| Phase | Inhalt | Bild |
|---|---|---|
| Hook | Ort, Uhrzeit, Beutesumme in einem Satz | Stadt-Silhouette bei Nacht, Wahrzeichen |
| Plan | „Der Plan beginnt Tage vorher.“ und die Vorbereitung | Tageslicht vs. Nacht, Nahaufnahme der Vorbereitung |
| Ablenkung | Strom aus, Licht aus, Alarm umgangen | Feuer, Funken, Laternen gehen in einer Welle aus |
| Einstieg | Wie sie reinkommen | Figuren mit Taschenlampen-Kegeln |
| Tat | Werkzeug, Treffer, Beute-Zähler läuft hoch | Innenraum, Vitrine, Splitter, Alarmlicht |
| Alarm | Uhrzeit des Notrufs | Überwachungskamera-Look, Blaulicht |
| Flucht | Spuren verwischen | Pulver, brennendes Fluchtauto |
| Verschwinden | „Dann … sind sie verschwunden.“ | leerer Tatort, Stille (`bed_gain`) |
| Ermittlung | Jahre als Zeitsprünge | Razzia, Asservaten, Gericht |
| Offenes Ende | Was fehlt bis heute | ein einzelnes Objekt im Dunkeln |
| Endcard | „Wo ist …?“ und Theorien-Pills, „SCHREIB DEINE THEORIE IN DIE KOMMENTARE“ | gedimmtes Objekt |

**HUD Format B:**
- Kennzeichnung oben in Rot: „ECHTE RAUBZÜGE #N · REKONSTRUKTION“.
- Label: „BEUTE · VERSICHERUNGSWERT“, die Zahl in Euro steigt Stück für Stück während der Tat.
- Unterzeile wechselt: Ort → Datum + Uhrzeit → „SCHMUCKSTÜCKE n / 21“ → Endstand.
- Delta-Zeilen bilden die Zeitleiste: rot für Tat-Ereignisse („Stromkasten · in Brand gesetzt“),
  grün für Ermittlungserfolge („Nov. 2020 · Festnahmen“), rot für das offene Ende („Fehlt bis heute“).

**Bildsprache Format B:**
- Kühle blaue Nacht statt Rot.
- Überwachungskamera-Shot mit Graustufen-Filter auf dem Canvas, Zeilen, „● REC“, Rahmen.
- Taschenlampen als SpotLight mit sichtbarem Kegel.
- Innenräume ohne Himmel (`scene.background` = Nebelfarbe).
- Pro Schauplatz eine eigene Gruppe, weit entfernt aufgebaut und nur in ihren Shots sichtbar.

**Sound Format B:** Klangteppich `noir`, dazu Schleifer, Klirren, Stromschlag, Glas-Treffer,
Museumsalarm, Martinshorn, Überwachungs-Brummen, Wumms beim Feuer und Stille vor der Auflösung.
