"""
Build every model artifact the site ships.

    python ml/train/build_index.py

Reads   data/corpus.json          (exported from the TypeScript content)
Writes  web/public/models/*.json  (loaded by the browser at runtime)
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

sys.path.insert(0, str(Path(__file__).parent))
from lm import KneserNeyTrigram  # noqa: E402
from retrieval import BM25Index  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "data" / "corpus.json"
OUT = ROOT / "web" / "public" / "models"


def _relax(Z: np.ndarray, min_dist: float = 0.6, iterations: int = 250) -> np.ndarray:
    """Push points apart until each pair clears `min_dist`, then recentre."""
    P = Z.astype(float).copy()
    n = len(P)
    for _ in range(iterations):
        moved = False
        for i in range(n):
            for j in range(i + 1, n):
                d = P[i] - P[j]
                dist = float(np.linalg.norm(d))
                if dist < 1e-6:
                    d = np.random.default_rng(i * 97 + j).normal(size=3)
                    dist = float(np.linalg.norm(d))
                if dist < min_dist:
                    push = (min_dist - dist) * 0.5
                    step = (d / dist) * push
                    P[i] += step
                    P[j] -= step
                    moved = True
        if not moved:
            break
    P -= P.mean(axis=0)                      # centre the cloud
    scale = np.abs(P).max() or 1.0
    return P / scale                          # normalise into [-1, 1]


def human(n: int) -> str:
    return f"{n/1024:.1f} KB" if n < 1024 * 1024 else f"{n/1024/1024:.2f} MB"


def main() -> None:
    t0 = time.time()
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(CORPUS.read_text())
    evidence = data["evidence"]
    writing = data["writing"]

    print(f"corpus: {len(evidence)} evidence items, {len(writing)} writing segments")

    # ── 1. language model ────────────────────────────────────────────
    print("\n[1/4] training Kneser-Ney trigram language model…")
    # Held-out evaluation first: training perplexity on a memorising n-gram model
    # is meaningless, so score a 90/10 split before training the shipped model.
    rng = np.random.default_rng(42)
    order = rng.permutation(len(writing))
    cut = max(int(len(writing) * 0.9), 1)
    train = [writing[i] for i in order[:cut]]
    held = [writing[i] for i in order[cut:]] or [writing[int(order[0])]]
    eval_lm = KneserNeyTrigram(discount=0.75).fit(train)
    ppl_held = eval_lm.perplexity(held)
    ppl_train = eval_lm.perplexity(train)

    # Now train on everything for the artifact that actually ships.
    lm = KneserNeyTrigram(discount=0.75).fit(writing)
    lm_blob = lm.export(top_k=8)
    lm_blob["stats"]["perplexityHeldOut"] = round(ppl_held, 2)
    lm_blob["stats"]["perplexityTrain"] = round(ppl_train, 2)
    ppl = ppl_held
    (OUT / "lm.json").write_text(json.dumps(lm_blob, separators=(",", ":")))
    s = lm_blob["stats"]
    print(f"      vocab {s['vocabSize']} · bigram ctx {s['bigramContexts']} · trigram ctx {s['trigramContexts']}")
    print(f"      perplexity: {ppl_train:.1f} train / {ppl_held:.1f} held-out (90-10 split)")

    # ── 2. retrieval index ───────────────────────────────────────────
    print("\n[2/4] building BM25 + concept-expansion index…")
    bm = BM25Index().fit([(e["id"], f"{e['text']} {' '.join(e['tags'])}") for e in evidence])
    idx = bm.export()
    idx["docs"] = [
        {
            "id": e["id"],
            "text": e["text"],
            "sourceId": e["sourceId"],
            "sourceLabel": e["sourceLabel"],
            "sourceKind": e["sourceKind"],
            "tags": e["tags"],
        }
        for e in evidence
    ]
    (OUT / "index.json").write_text(json.dumps(idx, separators=(",", ":")))
    print(f"      {len(idx['idf'])} unique terms · {len(idx['concepts'])} concept expansions")

    # ── 3. semantic space (LSA) for the constellation ────────────────
    print("\n[3/4] projecting semantic space…")
    # aggregate evidence per project/role so each node is one document
    groups: dict[str, dict] = {}
    for e in evidence:
        if e["sourceKind"] not in ("project", "role"):
            continue
        g = groups.setdefault(
            e["sourceId"],
            {"id": e["sourceId"], "label": e["sourceLabel"], "kind": e["sourceKind"], "text": [], "tags": set()},
        )
        g["text"].append(e["text"])
        g["tags"].update(e["tags"])

    keys = list(groups)
    # Repeat the stack tags so shared technology counts as strong evidence of
    # similarity: two React projects ARE closer than a React one and an ML one,
    # and raw prose alone under-weights that.
    texts = [
        " ".join(groups[k]["text"]) + " " + " ".join(sorted(groups[k]["tags"]) * 4)
        for k in keys
    ]

    vec = TfidfVectorizer(sublinear_tf=True, ngram_range=(1, 1), min_df=1, stop_words="english")
    X = vec.fit_transform(texts)
    dims = min(3, X.shape[0] - 1)
    svd = TruncatedSVD(n_components=max(dims, 2), random_state=42)
    Z = svd.fit_transform(X)
    if Z.shape[1] < 3:
        Z = np.hstack([Z, np.zeros((Z.shape[0], 3 - Z.shape[1]))])
    Z = normalize(Z)  # onto the unit sphere — distance is angular = semantic

    # SVD puts semantically close nodes almost exactly on top of each other,
    # which is correct as data and unreadable as a picture. Relax the points
    # with a short repulsion pass seeded by the projection: the ordering and
    # neighbourhood structure survive, the labels stop colliding.
    Z = _relax(Z, min_dist=0.62, iterations=260)

    # cosine similarity on the full TF-IDF space (not the reduced one)
    Xn = normalize(X)
    S = (Xn @ Xn.T).toarray()
    np.fill_diagonal(S, 0.0)

    nodes, edges = [], []
    for i, k in enumerate(keys):
        g = groups[k]
        nodes.append({
            "id": g["id"],
            "label": g["label"],
            "kind": g["kind"],
            "pos": [round(float(v), 4) for v in Z[i]],
            "tags": sorted(g["tags"])[:8],
        })
    # Relative threshold: keep each node's strongest links rather than applying
    # an absolute cutoff, which is arbitrary on a corpus this size.
    smax = float(S.max()) or 1.0
    floor = float(np.percentile(S[S > 0], 70))
    for i, k in enumerate(keys):
        for j in np.argsort(-S[i])[:2]:
            j = int(j)
            if S[i][j] >= floor:
                a, b = sorted([keys[i], keys[j]])
                edges.append({"a": a, "b": b, "w": round(float(S[i][j]) / smax, 4)})
    edges = list({f"{e['a']}|{e['b']}": e for e in edges}.values())

    (OUT / "space.json").write_text(json.dumps({"nodes": nodes, "edges": edges}, separators=(",", ":")))
    print(f"      {len(nodes)} nodes · {len(edges)} semantic edges · "
          f"explained variance {svd.explained_variance_ratio_.sum():.1%}")

    # ── 4. build manifest for the /system page ───────────────────────
    print("\n[4/4] writing manifest…")
    sizes = {p.name: p.stat().st_size for p in OUT.glob("*.json") if p.name != "meta.json"}
    meta = {
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "buildSeconds": round(time.time() - t0, 2),
        "artifacts": [{"name": n, "bytes": b, "human": human(b)} for n, b in sorted(sizes.items())],
        "totalBytes": sum(sizes.values()),
        "totalHuman": human(sum(sizes.values())),
        "lm": lm_blob["stats"],
        "lmEval": {"heldOutPerplexity": round(ppl_held, 2), "trainPerplexity": round(ppl_train, 2),
                   "split": "90/10", "heldOutSegments": len(held)},
        "retrieval": {
            "documents": len(evidence),
            "terms": len(idx["idf"]),
            "conceptExpansions": len(idx["concepts"]),
        },
        "space": {
            "nodes": len(nodes),
            "edges": len(edges),
            "explainedVariance": round(float(svd.explained_variance_ratio_.sum()), 4),
        },
        "corpusWords": sum(len(w.split()) for w in writing),
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2))

    print(f"\n✓ artifacts → {OUT}")
    for a in meta["artifacts"]:
        print(f"    {a['name']:<14} {a['human']:>10}")
    print(f"    {'TOTAL':<14} {meta['totalHuman']:>10}   (built in {meta['buildSeconds']}s)")


if __name__ == "__main__":
    main()
