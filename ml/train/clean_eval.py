"""
Leak-free evaluation.

Oversampling the technical docs put identical sentences on both sides of the
train/validation split. A trigram model memorises those outright, which is why
it "scored" 26.8 — it was being tested on text it had already seen. The number
was meaningless and so was the comparison.

This builds a validation set of sentences that occur exactly once in the whole
corpus, so nothing in it can have been memorised, and scores both models there.
"""
from __future__ import annotations
import math, re, sys
from collections import Counter, defaultdict
from pathlib import Path
import torch

sys.path.insert(0, str(Path(__file__).parent))
from transformer import TinyGPT, clean, TOKEN, VOCAB, CONTEXT   # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "ml" / "corpus"
CKPT = ROOT / "ml" / "checkpoints" / "tinygpt.pt"
D = 0.75


def sentences():
    out = []
    for f in sorted(CORPUS.glob("*.txt")):
        if f.stat().st_size < 1000:
            continue
        raw = f.read_text(encoding="utf-8", errors="ignore")
        if "PROJECT GUTENBERG" in raw.upper():
            raw = clean(raw)
        for s in re.split(r"(?<=[.!?])\s+", raw.lower()):
            t = TOKEN.findall(s)
            if 3 <= len(t) <= 40:
                out.append(tuple(t))
    return out


def main():
    sents = sentences()
    counts = Counter(sents)
    unique = [s for s in sents if counts[s] == 1]
    dupes = len(sents) - len(unique)
    print(f"sentences: {len(sents):,} total · {dupes:,} appear more than once "
          f"({dupes/len(sents):.1%}) · {len(unique):,} occur exactly once")

    ck = torch.load(CKPT, map_location="cpu", weights_only=False)
    vocab = ck["vocab"]; idx = {w: i for i, w in enumerate(vocab)}

    # validation = the last 4,000 sentences that occur exactly once anywhere.
    # Nothing here can have been memorised from the training half.
    val_sents = unique[-4000:]
    val_set = set(val_sents)
    train_sents = [s for s in sents if s not in val_set]
    print(f"clean split: {len(train_sents):,} train · {len(val_sents):,} held out (all unique)\n")

    def ids(ss):
        out = []
        for s in ss:
            out.extend(idx.get(t, 0) for t in s)
            out.append(idx.get("</s>", 1))
        return out

    tr, va = ids(train_sents), ids(val_sents)

    # ── trigram, trained only on the clean training half ──
    uni, bi, tri = Counter(), defaultdict(Counter), defaultdict(Counter)
    cont = defaultdict(set); total_bi = 0
    for i, w in enumerate(tr):
        uni[w] += 1
        if i >= 1:
            bi[tr[i-1]][w] += 1; cont[w].add(tr[i-1]); total_bi += 1
        if i >= 2:
            tri[(tr[i-2], tr[i-1])][w] += 1
    bi_tot = {k: sum(v.values()) for k, v in bi.items()}
    tri_tot = {k: sum(v.values()) for k, v in tri.items()}

    def p_cont(w): return max(len(cont.get(w, ())), 1) / max(total_bi, 1)
    def p_bi(w1, w):
        row = bi.get(w1)
        if not row: return p_cont(w)
        tot = bi_tot[w1]; lam = (D * len(row)) / tot
        return max(row.get(w, 0) - D, 0) / tot + lam * p_cont(w)
    def p_tri(w1, w2, w):
        row = tri.get((w1, w2))
        if not row: return p_bi(w2, w)
        tot = tri_tot[(w1, w2)]; lam = (D * len(row)) / tot
        return max(row.get(w, 0) - D, 0) / tot + lam * p_bi(w2, w)

    logp = 0.0; n = 0
    for i in range(2, len(va)):
        logp += math.log(max(p_tri(va[i-2], va[i-1], va[i]), 1e-12)); n += 1
    kn_ppl = math.exp(-logp / n)

    # ── transformer on the same clean tokens ──
    m = TinyGPT(); m.load_state_dict(ck["model"]); m.eval()
    import torch.nn.functional as F
    t = torch.tensor(va, dtype=torch.long)
    tot, k = 0.0, 0
    with torch.no_grad():
        for i in range(0, len(t) - CONTEXT - 1, CONTEXT):
            x = t[i:i+CONTEXT].unsqueeze(0); y = t[i+1:i+CONTEXT+1].unsqueeze(0)
            tot += F.cross_entropy(m(x).view(-1, VOCAB), y.reshape(-1)).item(); k += 1
            if k >= 400: break
    gpt_ppl = math.exp(tot / k)

    print(f"{'model':<28}{'perplexity':>12}   (lower is better)")
    print("-" * 52)
    print(f"{'Kneser-Ney trigram':<28}{kn_ppl:>12.1f}")
    print(f"{'transformer (5.7M params)':<28}{gpt_ppl:>12.1f}")
    better = (kn_ppl - gpt_ppl) / kn_ppl * 100
    print(f"\ntransformer is {better:.1f}% better on leak-free held-out text")

    import json
    (ROOT / "web" / "public" / "models" / "comparison.json").write_text(json.dumps({
        "trigramPerplexity": round(kn_ppl, 1),
        "transformerPerplexity": round(gpt_ppl, 1),
        "improvementPct": round(better, 1),
        "heldOutSentences": len(val_sents),
        "trigramContext": 2,
        "transformerContext": CONTEXT,
        "leakFree": True,
    }, indent=2))


if __name__ == "__main__":
    main()
