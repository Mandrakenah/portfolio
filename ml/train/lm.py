"""
Interpolated modified Kneser-Ney trigram language model.

Trained on Arjun's own prose. Serialised to a compact integer-indexed
structure the browser loads and queries with no runtime dependencies.

Kneser-Ney is the right choice here because the corpus is small and
domain-specific: it discounts observed n-gram counts and redistributes the
mass using *continuation* probability -- how many distinct contexts a word
completes -- rather than raw frequency. That is why "monorepo" stays
predictable after "TypeScript" while a merely-frequent word like "the"
does not swamp every backoff.
"""
from __future__ import annotations

import re
from collections import defaultdict, Counter
from typing import Iterable

BOS, EOS = "<s>", "</s>"

_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9'\-\.]*|[0-9]+(?:\.[0-9]+)?%?|[.,;:!?]")


def tokenize(text: str) -> list[str]:
    """Lowercase word tokenizer that keeps tech tokens (next.js, ci/cd) intact."""
    toks = _TOKEN_RE.findall(text.lower())
    return [t.rstrip(".") if t.endswith(".") and len(t) > 2 and t not in {"next.js"} else t for t in toks]


class KneserNeyTrigram:
    def __init__(self, discount: float = 0.75) -> None:
        self.d = discount
        self.vocab: list[str] = []
        self.index: dict[str, int] = {}
        self.uni: Counter[int] = Counter()
        self.bi: dict[int, Counter[int]] = defaultdict(Counter)
        self.tri: dict[tuple[int, int], Counter[int]] = defaultdict(Counter)
        # continuation counts: how many distinct left-contexts precede a word
        self.cont_uni: dict[int, set[int]] = defaultdict(set)
        self.cont_bi: dict[int, set[tuple[int, int]]] = defaultdict(set)
        self.total_bigrams = 0

    # ── training ──────────────────────────────────────────────────────
    def fit(self, sentences: Iterable[str]) -> "KneserNeyTrigram":
        tokenised: list[list[str]] = []
        vocab_counter: Counter[str] = Counter()
        for s in sentences:
            toks = tokenize(s)
            if not toks:
                continue
            toks = [BOS, BOS] + toks + [EOS]
            tokenised.append(toks)
            vocab_counter.update(toks)

        self.vocab = [w for w, _ in vocab_counter.most_common()]
        self.index = {w: i for i, w in enumerate(self.vocab)}

        for toks in tokenised:
            ids = [self.index[t] for t in toks]
            for i, w in enumerate(ids):
                self.uni[w] += 1
                if i >= 1:
                    self.bi[ids[i - 1]][w] += 1
                    self.cont_uni[w].add(ids[i - 1])
                    self.total_bigrams += 1
                if i >= 2:
                    ctx = (ids[i - 2], ids[i - 1])
                    self.tri[ctx][w] += 1
                    self.cont_bi[w].add(ctx)
        return self

    # ── probability ───────────────────────────────────────────────────
    def _p_continuation(self, w: int) -> float:
        if self.total_bigrams == 0:
            return 1e-9
        return max(len(self.cont_uni.get(w, ())), 1) / self.total_bigrams

    def _p_bigram(self, w1: int, w: int) -> float:
        row = self.bi.get(w1)
        if not row:
            return self._p_continuation(w)
        total = sum(row.values())
        cnt = row.get(w, 0)
        lam = (self.d * len(row)) / total
        return max(cnt - self.d, 0.0) / total + lam * self._p_continuation(w)

    def p(self, w1: int, w2: int, w: int) -> float:
        row = self.tri.get((w1, w2))
        if not row:
            return self._p_bigram(w2, w)
        total = sum(row.values())
        cnt = row.get(w, 0)
        lam = (self.d * len(row)) / total
        return max(cnt - self.d, 0.0) / total + lam * self._p_bigram(w2, w)

    def perplexity(self, sentences: Iterable[str]) -> float:
        import math
        logp, n = 0.0, 0
        for s in sentences:
            toks = [BOS, BOS] + tokenize(s) + [EOS]
            ids = [self.index.get(t, -1) for t in toks]
            for i in range(2, len(ids)):
                if ids[i] < 0:
                    continue
                w1 = ids[i - 2] if ids[i - 2] >= 0 else 0
                w2 = ids[i - 1] if ids[i - 1] >= 0 else 0
                logp += math.log(max(self.p(w1, w2, ids[i]), 1e-12))
                n += 1
        return math.exp(-logp / max(n, 1))

    # ── export ────────────────────────────────────────────────────────
    def export(self, top_k: int = 8) -> dict:
        """
        Ships only the top-k continuations per context. The browser never needs
        the full distribution -- it needs the best handful, fast -- and this is
        what keeps the artifact in the tens of kilobytes rather than megabytes.
        """
        def top(counter: Counter[int], ctx_total: int, n_types: int, backoff):
            items = []
            lam = (self.d * n_types) / ctx_total if ctx_total else 1.0
            for w, cnt in counter.most_common(top_k):
                pr = max(cnt - self.d, 0.0) / ctx_total + lam * backoff(w)
                items.append([w, round(pr, 6)])
            return items

        bi_out: dict[str, list] = {}
        for w1, row in self.bi.items():
            total = sum(row.values())
            bi_out[str(w1)] = top(row, total, len(row), self._p_continuation)

        tri_out: dict[str, list] = {}
        for (w1, w2), row in self.tri.items():
            total = sum(row.values())
            tri_out[f"{w1},{w2}"] = top(row, total, len(row), lambda w, a=w2: self._p_bigram(a, w))

        uni_total = sum(self.uni.values())
        uni_out = [
            [w, round(c / uni_total, 6)]
            for w, c in self.uni.most_common(400)
            if self.vocab[w] not in {BOS}
        ]

        return {
            "vocab": self.vocab,
            "unigram": uni_out,
            "bigram": bi_out,
            "trigram": tri_out,
            "discount": self.d,
            "stats": {
                "vocabSize": len(self.vocab),
                "bigramContexts": len(self.bi),
                "trigramContexts": len(self.tri),
                "tokensSeen": uni_total,
            },
        }
