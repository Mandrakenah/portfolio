"""
A small GPT-style transformer, trained from scratch on general English.

Why not just call a pretrained model? Because the point of this page is work
Arjun did, and "I fine-tuned nothing, I called someone's API" is not that. This
is a decoder-only transformer defined, trained, quantised and served here — and
the inference that runs it in the browser is hand-written too.

It is deliberately small (~4M parameters, 4 layers) for two reasons: it has to
train on two CPU threads, and it has to download to a visitor's phone. A model
this size trained on ~1M words will not write like GPT. What it does do, which
the trigram model cannot, is use the whole preceding sentence instead of the
last two words — and that difference is measurable, which is the interesting part.
"""
from __future__ import annotations

import json, math, re, time
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "ml" / "corpus"
OUT = ROOT / "web" / "public" / "models"
CKPT = ROOT / "ml" / "checkpoints"

VOCAB      = 14_000
D_MODEL    = 256
N_LAYER    = 4
N_HEAD     = 4
D_FF       = 512
CONTEXT    = 64
BATCH      = 32
STEPS      = 6_000
LR         = 3e-4
WARMUP     = 250
VAL_FRAC   = 0.05
SEED       = 1337
EVAL_EVERY = 250
PATIENCE   = 6          # evals without improvement before stopping

TOKEN = re.compile(r"[a-z][a-z'\-]*|[.,;:!?]")
torch.manual_seed(SEED)


# ─────────────────────────────────────────────────────────────────────
class Block(nn.Module):
    def __init__(self):
        super().__init__()
        self.ln1 = nn.LayerNorm(D_MODEL)
        self.attn = nn.MultiheadAttention(D_MODEL, N_HEAD, batch_first=True, dropout=0.1)
        self.ln2 = nn.LayerNorm(D_MODEL)
        self.ff = nn.Sequential(nn.Linear(D_MODEL, D_FF), nn.GELU(), nn.Linear(D_FF, D_MODEL))
        self.drop = nn.Dropout(0.1)

    def forward(self, x, mask):
        h = self.ln1(x)
        a, _ = self.attn(h, h, h, attn_mask=mask, need_weights=False)
        x = x + self.drop(a)
        x = x + self.drop(self.ff(self.ln2(x)))
        return x


class TinyGPT(nn.Module):
    def __init__(self):
        super().__init__()
        self.tok = nn.Embedding(VOCAB, D_MODEL)
        self.pos = nn.Embedding(CONTEXT, D_MODEL)
        self.blocks = nn.ModuleList([Block() for _ in range(N_LAYER)])
        self.lnf = nn.LayerNorm(D_MODEL)
        self.head = nn.Linear(D_MODEL, VOCAB, bias=False)
        self.head.weight = self.tok.weight          # tied — halves the parameter count
        self.apply(self._init)

    @staticmethod
    def _init(m):
        if isinstance(m, (nn.Linear, nn.Embedding)):
            nn.init.normal_(m.weight, std=0.02)
            if isinstance(m, nn.Linear) and m.bias is not None:
                nn.init.zeros_(m.bias)

    def forward(self, idx):
        T = idx.size(1)
        mask = torch.triu(torch.full((T, T), float("-inf")), diagonal=1)
        x = self.tok(idx) + self.pos(torch.arange(T, device=idx.device))
        for b in self.blocks:
            x = b(x, mask)
        return self.head(self.lnf(x))

    @torch.no_grad()
    def embed(self, idx):
        """Mean-pooled final hidden state — the same brain, used as a sentence encoder."""
        T = idx.size(1)
        mask = torch.triu(torch.full((T, T), float("-inf")), diagonal=1)
        x = self.tok(idx) + self.pos(torch.arange(T, device=idx.device))
        for b in self.blocks:
            x = b(x, mask)
        return F.normalize(self.lnf(x).mean(dim=1), dim=-1)


# ─────────────────────────────────────────────────────────────────────
def clean(text: str) -> str:
    s = re.search(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text, re.S)
    if s: text = text[s.end():]
    e = re.search(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG", text)
    if e: text = text[: e.start()]
    text = text.replace("\r", "")
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)
    return re.sub(r"_|\[|\]", "", text)


def build():
    from collections import Counter
    toks: list[str] = []
    for f in sorted(CORPUS.glob("*.txt")):
        if f.stat().st_size < 1000: continue
        raw = f.read_text(encoding="utf-8", errors="ignore")
        if "PROJECT GUTENBERG" in raw.upper(): raw = clean(raw)
        for sent in re.split(r"(?<=[.!?])\s+", raw.lower()):
            t = TOKEN.findall(sent)
            if 3 <= len(t) <= 40:
                toks.extend(t + ["</s>"])
    freq = Counter(toks)
    vocab = ["<unk>", "</s>"] + [w for w, _ in freq.most_common(VOCAB - 2) if w != "</s>"]
    vocab = vocab[:VOCAB]
    idx = {w: i for i, w in enumerate(vocab)}
    data = torch.tensor([idx.get(t, 0) for t in toks], dtype=torch.long)
    cov = sum(c for w, c in freq.items() if w in idx) / max(len(toks), 1)
    print(f"tokens {len(data):,} · vocab {len(vocab):,} · coverage {cov:.1%}")
    return data, vocab


def main():
    CKPT.mkdir(parents=True, exist_ok=True)
    data, vocab = build()
    # NOTE: this split is positional and the corpus contains repeated sentences,
    # so the val loss printed below is optimistic. ml/train/clean_eval.py is the
    # number that counts — it scores only sentences that occur exactly once.
    n_val = int(len(data) * VAL_FRAC)
    train_d, val_d = data[:-n_val], data[-n_val:]

    model = TinyGPT()
    n_params = sum(p.numel() for p in model.parameters())
    print(f"model: {n_params/1e6:.2f}M parameters ({N_LAYER} layers, d={D_MODEL}, ctx={CONTEXT})")

    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=LR, total_steps=STEPS,
                                                pct_start=WARMUP / STEPS)

    def batch(src):
        ix = torch.randint(len(src) - CONTEXT - 1, (BATCH,))
        x = torch.stack([src[i:i+CONTEXT] for i in ix])
        y = torch.stack([src[i+1:i+CONTEXT+1] for i in ix])
        return x, y

    @torch.no_grad()
    def evaluate(src, iters=24):
        model.eval(); tot = 0.0
        for _ in range(iters):
            x, y = batch(src)
            tot += F.cross_entropy(model(x).view(-1, VOCAB), y.reshape(-1)).item()
        model.train(); return tot / iters

    print(f"training up to {STEPS} steps (early stop patience {PATIENCE} evals)…")
    t0 = time.time()
    best, since_best, best_step = float("inf"), 0, 0

    def snapshot(vl: float, step: int):
        torch.save({"model": model.state_dict(), "vocab": vocab,
                    "cfg": dict(VOCAB=VOCAB, D_MODEL=D_MODEL, N_LAYER=N_LAYER, N_HEAD=N_HEAD,
                                D_FF=D_FF, CONTEXT=CONTEXT),
                    "val_loss": vl, "val_ppl": math.exp(vl), "params": n_params,
                    "step": step, "corpusTokens": len(data)},
                   CKPT / "tinygpt.pt")

    for step in range(1, STEPS + 1):
        x, y = batch(train_d)
        loss = F.cross_entropy(model(x).view(-1, VOCAB), y.reshape(-1))
        opt.zero_grad(set_to_none=True); loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step(); sched.step()

        if step % EVAL_EVERY == 0 or step == STEPS:
            vl = evaluate(val_d)
            el = time.time() - t0
            improved = vl < best - 1e-4
            if improved:
                best, since_best, best_step = vl, 0, step
                snapshot(vl, step)          # only ever keep the best epoch, never the last
            else:
                since_best += 1
            print(f"  step {step:>5}/{STEPS}  train {loss.item():.3f}  val {vl:.3f}  "
                  f"ppl {math.exp(vl):>7.1f}  {el/60:.1f}m  "
                  f"{'✓ saved' if improved else f'no gain ({since_best}/{PATIENCE})'}", flush=True)
            if since_best >= PATIENCE:
                print(f"\nearly stop at step {step}; best was step {best_step}")
                break

    print(f"\nBEST held-out loss {best:.4f} · perplexity {math.exp(best):.1f} (step {best_step})")
    print(f"saved → {CKPT/'tinygpt.pt'}")


if __name__ == "__main__":
    main()
