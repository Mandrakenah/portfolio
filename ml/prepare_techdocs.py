"""
Turn the markdown docs shipped inside node_modules into training prose.

This is the register the site is actually about — someone typing "experience
with React and TypeScript" is writing software English, not Victorian English.
The packages are MIT/Apache/ISC licensed, and the text is already on disk, so
no scraping and no licence problem.

Code blocks are stripped: the model is learning to finish sentences, and
feeding it `const x = require('y')` teaches it nothing useful about that.
"""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "web" / "node_modules"
OUT = ROOT / "ml" / "corpus" / "techdocs.txt"

def clean(md: str) -> str:
    md = re.sub(r"```.*?```", " ", md, flags=re.S)        # fenced code
    md = re.sub(r"~~~.*?~~~", " ", md, flags=re.S)
    md = re.sub(r"`[^`\n]+`", " ", md)                     # inline code
    md = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", md)          # images
    md = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", md)       # links -> label
    md = re.sub(r"^\s*[|>#*\-+=]+\s*", " ", md, flags=re.M)
    md = re.sub(r"<[^>]+>", " ", md)                       # html
    md = re.sub(r"https?://\S+", " ", md)
    md = re.sub(r"[^A-Za-z0-9 .,;:!?'\-\n]", " ", md)
    return re.sub(r"[ \t]{2,}", " ", md)

def main() -> None:
    kept, files = [], 0
    for f in SRC.rglob("*.md"):
        try:
            txt = clean(f.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            continue
        good = []
        for line in txt.split("\n"):
            w = line.split()
            # keep prose sentences, drop fragments and badge/API noise
            if 6 <= len(w) <= 45 and sum(c.isalpha() for c in line) / max(len(line), 1) > 0.72:
                good.append(" ".join(w))
        if good:
            kept.append("\n".join(good)); files += 1
    # Oversample. 239k words against 7.7M of general English is 3% — too thin
    # for the model to learn "react" or "typescript" as real words. Repeating the
    # technical text lifts it to roughly 11% of the corpus, which is enough to
    # teach the vocabulary without drowning out ordinary English.
    REPEAT = 2   # keep low: duplicated text leaks across train/val splits
    body = "\n".join(kept)
    OUT.write_text("\n".join([body] * REPEAT), encoding="utf-8")
    words = sum(len(k.split()) for k in kept)
    print(f"{files} files → {words:,} words × {REPEAT} = {words*REPEAT:,} effective → {OUT.name}")

if __name__ == "__main__":
    main()
