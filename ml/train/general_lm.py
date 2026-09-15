"""
General-English next-word model.

The personal model was trained on ~2,500 words of Arjun's own prose, which made
it sharp on his vocabulary and useless on everything else. This trains the same
Kneser-Ney trigram on general English so it predicts for whatever a visitor
types, the way Smart Compose does.

The whole problem is size. A trigram model over a million words has millions of
contexts; shipping that to a browser is not an option. So: cap the vocabulary,
drop contexts seen too rarely to be trustworthy, and keep only the top few
continuations of each. What survives is the part that actually fires in
practice — common phrasing — which is exactly what a completion UI needs.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "ml" / "corpus"
OUT = ROOT / "web" / "public" / "models"

# ── tuning knobs: the trade between quality and payload ──────────────
VOCAB_CAP      = 12_000
TRI_MIN_COUNT  = 3     # a trigram context must be seen this often to ship
BI_MIN_COUNT   = 2
TRI_TOP_K      = 3     # continuations kept per trigram context
BI_TOP_K       = 5
UNI_TOP        = 1_500
DISCOUNT       = 0.75

TOKEN = re.compile(r"[a-z][a-z'\-]*|[.,;:!?]")
BOS, EOS = "<s>", "</s>"


def clean_gutenberg(text: str) -> str:
    """Strip the licence header and footer Project Gutenberg wraps books in."""
    start = re.search(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text, re.S)
    if start:
        text = text[start.end():]
    end = re.search(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG", text)
    if end:
        text = text[: end.start()]
    return text


def sentences(text: str):
    text = text.replace("\r", "")
    text = re.sub(r"\n{2,}", "\n\n", text)
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)     # unwrap hard-wrapped lines
    text = re.sub(r"_|\[|\]", "", text)
    for chunk in re.split(r"(?<=[.!?])\s+", text):
        c = chunk.strip().lower()
        if 3 <= len(c.split()) <= 40:
            yield c


def main() -> None:
    files = sorted(p for p in CORPUS.glob("*.txt") if p.stat().st_size > 1000)
    print(f"reading {len(files)} sources")

    sents: list[list[str]] = []
    total_words = 0
    for f in files:
        raw = f.read_text(encoding="utf-8", errors="ignore")
        if "PROJECT GUTENBERG" in raw.upper():
            raw = clean_gutenberg(raw)
        n = 0
        for s in sentences(raw):
            toks = TOKEN.findall(s)
            if 3 <= len(toks) <= 40:
                sents.append(toks)
                total_words += len(toks)
                n += 1
        print(f"  {f.name:<42} {n:>7,} sentences")

    print(f"\ncorpus: {len(sents):,} sentences · {total_words:,} words")

    # ── vocabulary ───────────────────────────────────────────────────
    freq = Counter(t for s in sents for t in s)
    vocab = [BOS, EOS] + [w for w, _ in freq.most_common(VOCAB_CAP)]
    index = {w: i for i, w in enumerate(vocab)}
    covered = sum(c for w, c in freq.items() if w in index)
    print(f"vocabulary: {len(vocab):,} types covering {covered/total_words:.1%} of tokens")

    # ── counts ───────────────────────────────────────────────────────
    uni: Counter[int] = Counter()
    bi: dict[int, Counter[int]] = defaultdict(Counter)
    tri: dict[tuple[int, int], Counter[int]] = defaultdict(Counter)
    cont_uni: dict[int, set[int]] = defaultdict(set)
    total_bigrams = 0

    for s in sents:
        ids = [index[BOS], index[BOS]] + [index[t] for t in s if t in index] + [index[EOS]]
        for i, w in enumerate(ids):
            uni[w] += 1
            if i >= 1:
                bi[ids[i - 1]][w] += 1
                cont_uni[w].add(ids[i - 1])
                total_bigrams += 1
            if i >= 2:
                tri[(ids[i - 2], ids[i - 1])][w] += 1

    print(f"raw contexts: {len(bi):,} bigram · {len(tri):,} trigram")

    # ── Kneser-Ney probabilities, pruned on the way out ──────────────
    def p_cont(w: int) -> float:
        return max(len(cont_uni.get(w, ())), 1) / max(total_bigrams, 1)

    def p_bigram(w1: int, w: int) -> float:
        row = bi.get(w1)
        if not row:
            return p_cont(w)
        tot = sum(row.values())
        lam = (DISCOUNT * len(row)) / tot
        return max(row.get(w, 0) - DISCOUNT, 0.0) / tot + lam * p_cont(w)

    bi_out: dict[str, list] = {}
    for w1, row in bi.items():
        tot = sum(row.values())
        if tot < BI_MIN_COUNT:
            continue
        lam = (DISCOUNT * len(row)) / tot
        items = []
        for w, c in row.most_common(BI_TOP_K):
            if vocab[w] == BOS:
                continue
            pr = max(c - DISCOUNT, 0.0) / tot + lam * p_cont(w)
            items.append([w, round(pr, 5)])
        if items:
            bi_out[str(w1)] = items

    tri_out: dict[str, list] = {}
    for (w1, w2), row in tri.items():
        tot = sum(row.values())
        if tot < TRI_MIN_COUNT:
            continue
        lam = (DISCOUNT * len(row)) / tot
        items = []
        for w, c in row.most_common(TRI_TOP_K):
            if vocab[w] == BOS:
                continue
            pr = max(c - DISCOUNT, 0.0) / tot + lam * p_bigram(w2, w)
            items.append([w, round(pr, 5)])
        if items:
            tri_out[f"{w1},{w2}"] = items

    uni_total = sum(uni.values())
    uni_out = [[w, round(c / uni_total, 6)] for w, c in uni.most_common(UNI_TOP)
               if vocab[w] not in (BOS,)]

    blob = {
        "vocab": vocab,
        "unigram": uni_out,
        "bigram": bi_out,
        "trigram": tri_out,
        "discount": DISCOUNT,
        "stats": {
            "vocabSize": len(vocab),
            "bigramContexts": len(bi_out),
            "trigramContexts": len(tri_out),
            "tokensSeen": total_words,
            "sentences": len(sents),
            "sources": len(files),
        },
    }
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "lm-general.json"
    path.write_text(json.dumps(blob, separators=(",", ":")))
    mb = path.stat().st_size / 1_048_576
    print(f"\nshipped contexts: {len(bi_out):,} bigram · {len(tri_out):,} trigram")
    print(f"artifact: {path.name}  {mb:.2f} MB raw")
    return mb


if __name__ == "__main__":
    main()
