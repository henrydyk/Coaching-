# MapBuilder – Roblox Maps aus Text bauen

Du tippst in Roblox Studio z.B. **"baue eine runde 1vs1 lava map"** – und das Plugin baut die Map direkt in deine Welt. Kein Server, kein API-Key, alles läuft lokal in Studio.

## Installation (einmalig, ca. 2 Minuten)

1. Öffne **Roblox Studio** und irgendein Place (z.B. ein leeres Baseplate).
2. Öffne den **Explorer** (Ansicht → Explorer) und den **Output** (Ansicht → Output).
3. Erstelle ein Script: Rechtsklick auf **ServerScriptService → Insert Object → Script**.
4. Lösche den Inhalt und füge den kompletten Inhalt von [`plugin/MapBuilder.lua`](plugin/MapBuilder.lua) ein.
5. **Rechtsklick auf das Script → "Save as Local Plugin"** (Als lokales Plugin speichern).
6. Oben in der Leiste **Plugins** erscheint jetzt ein Button **MapBuilder** – anklicken, Fenster geht auf.
7. Das Script in ServerScriptService kannst du danach wieder löschen (das Plugin ist jetzt installiert).

## Benutzung

Ins Textfeld schreiben, was du willst, dann **Bauen!** drücken (oder Enter). Beispiele:

| Eingabe | Ergebnis |
|---|---|
| `baue eine 1vs1 map` | Eckige Arena, 2 Spawns, Säulen, Torbögen |
| `runde 1vs1 lava map` | **Runde** Arena mit Kreismauer, Lava-Theme |
| `große ffa arena eis` | Große Arena für 4 Spieler, Eis-Theme |
| `obby wald` | Parkour mit runden Plattformen, Checkpoints, Kuppel am Ziel |
| `spleef map` | Runde Spleef-Plattform über Lava |

### Wörter, die das Plugin versteht

- **Map-Typ:** `1vs1`, `ffa` / `2vs2`, `obby` / `parkour`, `spleef`
- **Form:** `rund` / `kreis` → runde Arena statt eckiger
- **Größe:** `klein`, `groß`
- **Theme:** `lava`, `eis`, `wald`, `weltraum`/`space`

Jede gebaute Map landet als eigenes Model in Workspace (Name beginnt mit "MapBuilder:"). **Strg+Z** macht den Bau rückgängig, oder du löschst das Model im Explorer.

## Rundungen – warum es nicht nur Blöcke sind

Roblox kann von Haus aus mehr als Würfel, und das Plugin nutzt das:

- **Zylinder** (`Enum.PartType.Cylinder`) → runde Säulen, runde Böden, runde Plattformen
- **Kugeln** (`Enum.PartType.Ball`) → Deko, Hindernisse
- **Wedges** → Rampen und Schrägen
- **Segment-Tricks** → runde Mauern, Torbögen und Kuppeln aus vielen kleinen, gedrehten Teilen

Für noch glattere Formen gibt es in Studio zusätzlich:

- **Union/Negate** (Model-Tab → Solid Modeling): Teile verschmelzen oder rund ausstanzen
- **MeshParts**: richtige 3D-Modelle, z.B. aus **Blender** importiert (Avatar/Datei → Import 3D)

## Ideen für später

- Mehr Map-Typen (Tycoon-Grundriss, Racing-Strecke, Hide & Seek)
- Echte KI-Anbindung: ein lokaler Server, der deine Beschreibung an Claude schickt und einen Bauplan zurückgibt, den das Plugin ausführt
- Spleef-Platten per Script zerstörbar machen
