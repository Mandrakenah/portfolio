"""Write the corpus statistics the site quotes, so the copy can never drift."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "ml" / "corpus"
OUT = ROOT / "web" / "public" / "models" / "corpus-stats.json"

groups = {
    "public-domain books (Project Gutenberg)": lambda n: not n.startswith(("nltk-", "techdocs", "twitter")),
    "NLTK research corpora (news, forums, reviews, chat)": lambda n: n.startswith("nltk-"),
    "conversational text": lambda n: n.startswith("twitter"),
    "software documentation (MIT/Apache npm packages)": lambda n: n.startswith("techdocs"),
}

counts, files = {}, 0
for f in sorted(CORPUS.glob("*.txt")):
    w = len(f.read_text(encoding="utf-8", errors="ignore").split())
    files += 1
    for label, match in groups.items():
        if match(f.name):
            counts[label] = counts.get(label, 0) + w
            break

total = sum(counts.values())
tech = counts.get("software documentation (MIT/Apache npm packages)", 0)
stats = {
    "words": total,
    "files": files,
    "sources": len([c for c in counts.values() if c]),
    "technicalShare": round(tech / total * 100),
    "breakdown": [
        {"label": k, "words": v, "share": round(v / total * 100, 1)}
        for k, v in sorted(counts.items(), key=lambda kv: -kv[1]) if v
    ],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(stats, indent=2))
print(f"{total:,} words across {files} files")
for b in stats["breakdown"]:
    print(f"  {b['share']:>5.1f}%  {b['words']:>9,}  {b['label']}")
