"""
Honest head-to-head: the trigram model vs the transformer.

Same vocabulary, same tokenisation, same held-out tokens. Anything less than
that and the comparison is marketing rather than measurement.
"""
from __future__ import annotations
import math, re, sys
from collections import Counter, defaultdict
from pathlib import Path
import torch

sys.path.insert(0, str(Path(__file__).parent))
from transformer import TinyGPT, build, VOCAB, CONTEXT, VAL_FRAC   # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CKPT = ROOT / "ml" / "checkpoints" / "tinygpt.pt"
D = 0.75


def kn_perplexity(train_ids, val_ids, V):
    uni, bi, tri = Counter(), defaultdict(Counter), defaultdict(Counter)
    cont = defaultdict(set); total_bi = 0
    t = train_ids.tolist()
    for i, w in enumerate(t):
        uni[w] += 1
        if i >= 1:
            bi[t[i-1]][w] += 1; cont[w].add(t[i-1]); total_bi += 1
        if i >= 2:
            tri[(t[i-2], t[i-1])][w] += 1
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

    v = val_ids.tolist(); logp = 0.0; n = 0
    for i in range(2, len(v)):
        logp += math.log(max(p_tri(v[i-2], v[i-1], v[i]), 1e-12)); n += 1
    return math.exp(-logp / n), n


@torch.no_grad()
def gpt_perplexity(model, val_ids, iters=120):
    import torch.nn.functional as F
    model.eval(); tot = 0.0
    g = torch.Generator().manual_seed(7)
    for _ in range(iters):
        ix = torch.randint(len(val_ids) - CONTEXT - 1, (32,), generator=g)
        x = torch.stack([val_ids[i:i+CONTEXT] for i in ix])
        y = torch.stack([val_ids[i+1:i+CONTEXT+1] for i in ix])
        tot += F.cross_entropy(model(x).view(-1, VOCAB), y.reshape(-1)).item()
    return math.exp(tot / iters)


def main():
    data, vocab = build()
    n_val = int(len(data) * VAL_FRAC)
    train_ids, val_ids = data[:-n_val], data[-n_val:]
    print(f"\nheld-out tokens: {len(val_ids):,}\n")

    ck = torch.load(CKPT, map_location="cpu", weights_only=False)
    m = TinyGPT(); m.load_state_dict(ck["model"])

    print("scoring the trigram model on the held-out split…")
    kn_ppl, n = kn_perplexity(train_ids, val_ids, len(vocab))
    print("scoring the transformer on the held-out split…")
    gpt_ppl = gpt_perplexity(m, val_ids)

    print(f"\n{'model':<26}{'perplexity':>12}   (lower is better)")
    print(f"{'-'*50}")
    print(f"{'Kneser-Ney trigram':<26}{kn_ppl:>12.1f}")
    print(f"{'transformer (4.2M params)':<26}{gpt_ppl:>12.1f}")
    better = (kn_ppl - gpt_ppl) / kn_ppl * 100
    print(f"\ntransformer is {better:.1f}% better on the same held-out text")
    print(f"(trigram sees 2 words of context; the transformer sees {CONTEXT})")

    import json
    (ROOT / "web" / "public" / "models" / "comparison.json").write_text(json.dumps({
        "trigramPerplexity": round(kn_ppl, 1),
        "transformerPerplexity": round(gpt_ppl, 1),
        "improvementPct": round(better, 1),
        "heldOutTokens": len(val_ids),
        "trigramContext": 2,
        "transformerContext": CONTEXT,
    }, indent=2))


if __name__ == "__main__":
    main()
