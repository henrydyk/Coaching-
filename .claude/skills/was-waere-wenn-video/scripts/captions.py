"""Untertitel-Block in index.html aus timing.json neu schreiben.

Aufruf: python3 -I captions.py <video-ordner>
Ersetzt alles zwischen <!-- CAPTIONS:START --> und <!-- CAPTIONS:END -->.
Rollen aus script.json: "hook" (großer Einstiegssatz), "caption" (kursive Untertitel),
"endcard" (wird nicht als Untertitel gezeigt, die Endcard übernimmt).
"""
import html, json, os, re, sys

LEAD = 0.08  # Untertitel erscheinen minimal vor dem gesprochenen Wort


def main(video_dir):
    script = json.load(open(os.path.join(video_dir, "script.json"), encoding="utf-8"))
    timing = json.load(open(os.path.join(video_dir, "timing.json"), encoding="utf-8"))
    roles = {b["id"]: b.get("role", "caption") for b in script["beats"]}
    beats = timing["beats"]
    lines = []
    for i, b in enumerate(beats):
        role = roles.get(b["id"], "caption")
        nxt = beats[i + 1]["start"] - LEAD if i + 1 < len(beats) else b["end"] + 0.6
        t_in = 0.0 if role == "hook" else max(0.0, b["start"] - LEAD)
        text = html.escape(b["caption"])
        if role == "hook":
            lines.append(f'<div id="hook" data-out="{nxt:.2f}"><p>{text}</p></div>')
        elif role == "caption":
            lines.append(f'<div class="cap" id="cap-{b["id"]}" data-in="{t_in:.2f}" data-out="{nxt:.2f}"><p>{text}</p></div>')
    block = "\n        ".join(lines)
    path = os.path.join(video_dir, "index.html")
    src = open(path, encoding="utf-8").read()
    new, n = re.subn(r"(<!-- CAPTIONS:START -->)(.*?)(\s*<!-- CAPTIONS:END -->)",
                     lambda m: f"{m.group(1)}\n        {block}{m.group(3)}", src, flags=re.S)
    if n != 1:
        sys.exit("CAPTIONS-Marker nicht gefunden")
    open(path, "w", encoding="utf-8").write(new)
    print(f"{len(lines)} Text-Elemente geschrieben.")


if __name__ == "__main__":
    main(sys.argv[1])
