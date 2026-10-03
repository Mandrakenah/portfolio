"""
A small GPT-style transformer, trained from scratch on general English.

Why not just call a pretrained model? Because the point of this page is work
Arjun did, and "I fine-tuned nothing, I called someone's API" is not that. This
is a decoder-only transformer defined, trained, quantised and served here — and
the inference that runs it in the browser is hand-written too.

Size is set by two hard limits: it trains on two CPU threads, and it has to
download to a visitor's phone. Within those, bigger is better, so this is about
as large as the budget allows — ~12M parameters over 6 layers, trained on 34M
words of public-domain and permissively-licensed text.

It will not write like GPT and the site says so. What it does, which the
trigram baseline cannot, is use the whole preceding sentence rather than the
last two words — and that difference is measurable, which is the point.
"""
from __future__ import annotations

import json, math, os, re, time
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[2]
# Overridable so a Windows run can keep its ~700MB of corpus, token cache and
# checkpoints outside the OneDrive-synced project folder. Syncing those to the
# cloud every few minutes is slow and pointless; only the final model matters.
CORPUS = Path(os.environ.get("CORPUS_DIR") or ROOT / "ml" / "corpus")
OUT = ROOT / "web" / "public" / "models"
CKPT = Path(os.environ.get("CKPT_DIR") or ROOT / "ml" / "checkpoints")

VOCAB      = 16_000
D_MODEL    = 320
N_LAYER    = 6
N_HEAD     = 8
D_FF       = 1_280
CONTEXT    = 96
# Both are set by the device in main(): a 4GB laptop GPU runs this roughly ten
# times faster than two CPU threads, which buys the long run back.
BATCH      = int(os.environ.get("BATCH", 0)) or None
STEPS      = int(os.environ.get("STEPS", 0)) or None
BATCH_CPU, STEPS_CPU = 24, 15_000       # ~7.5 hours on two threads
STEPS_GPU = 35_000                      # ~3 hours on an RTX 3050 laptop
LR         = 3e-4
WARMUP     = 1_000
VAL_FRAC   = 0.03
SEED       = 1337
EVAL_EVERY = 500
RESUME_EVERY = 100      # the build container is reclaimed when idle; checkpoint often
PATIENCE   = 8          # evals without improvement before stopping

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
        # device=idx.device matters: without it the mask is built on the CPU
        # while the model sits on the GPU, and attention dies on the mismatch.
        # CPU-only testing cannot catch this — everything is on one device there.
        mask = torch.triu(torch.full((T, T), float("-inf"), device=idx.device), diagonal=1)
        x = self.tok(idx) + self.pos(torch.arange(T, device=idx.device))
        for b in self.blocks:
            x = b(x, mask)
        return self.head(self.lnf(x))

    @torch.no_grad()
    def embed(self, idx):
        """Mean-pooled final hidden state — the same brain, used as a sentence encoder."""
        T = idx.size(1)
        # device=idx.device matters: without it the mask is built on the CPU
        # while the model sits on the GPU, and attention dies on the mismatch.
        # CPU-only testing cannot catch this — everything is on one device there.
        mask = torch.triu(torch.full((T, T), float("-inf"), device=idx.device), diagonal=1)
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
    """Tokenise the corpus into a flat id tensor.

    Two streaming passes rather than one in-memory list: 34M words held as
    Python strings is several gigabytes, and this trains on a 7GB box. Pass one
    counts, pass two encodes straight into an int32 array.
    """
    from collections import Counter
    import array

    src = CORPUS / "corpus.txt"
    if not src.exists():
        raise SystemExit(f"{src} missing — run ml/build_corpus.py first")

    cache = CKPT / f"tokens-v{VOCAB}.pt"
    if cache.exists() and cache.stat().st_mtime > src.stat().st_mtime:
        blob = torch.load(cache, weights_only=False)
        print(f"tokens {len(blob['data']):,} · vocab {len(blob['vocab']):,} (cached)")
        return blob["data"], blob["vocab"]

    def stream():
        """Yield token lists, one per sentence, without holding the corpus."""
        with src.open(encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                for sent in re.split(r"(?<=[.!?])\s+", line.lower()):
                    t = TOKEN.findall(sent)
                    if 3 <= len(t) <= 40:
                        yield t

    freq: Counter[str] = Counter()
    total = 0
    for t in stream():
        freq.update(t)
        total += len(t) + 1
    vocab = ["<unk>", "</s>"] + [w for w, _ in freq.most_common(VOCAB - 2) if w != "</s>"]
    vocab = vocab[:VOCAB]
    idx = {w: i for i, w in enumerate(vocab)}

    buf = array.array("i")
    for t in stream():
        buf.extend([idx.get(w, 0) for w in t])
        buf.append(1)                       # </s>

    data = torch.frombuffer(buf, dtype=torch.int32).long()
    cov = sum(c for w, c in freq.items() if w in idx) / max(sum(freq.values()), 1)
    CKPT.mkdir(parents=True, exist_ok=True)
    torch.save({"data": data, "vocab": vocab}, cache)
    print(f"tokens {len(data):,} · vocab {len(vocab):,} · coverage {cov:.1%}")
    return data, vocab


VRAM_GB = 0.0


def pick_device() -> torch.device:
    """CUDA if it is really there. torch installed without CUDA support is the
    usual reason a GPU goes unused, so say which one we got rather than
    silently running ten times slower than the user expects."""
    global VRAM_GB
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0)
        VRAM_GB = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"device: {name} ({VRAM_GB:.1f} GB VRAM)")
        return torch.device("cuda")
    print(f"device: CPU ({torch.get_num_threads()} threads) — no CUDA GPU visible to torch")
    return torch.device("cpu")


def main():
    global BATCH, STEPS
    CKPT.mkdir(parents=True, exist_ok=True)
    dev = pick_device()
    gpu = dev.type == "cuda"
    if BATCH is None:
        # The logits tensor dominates: batch x context x 16k vocab, upcast to
        # fp32 by cross_entropy, plus its gradient. At batch 32 that is ~400 MB,
        # which leaves a 4GB card room for Windows and a browser.
        BATCH = (64 if VRAM_GB >= 10 else 48 if VRAM_GB >= 6 else 32) if gpu else BATCH_CPU
    if STEPS is None: STEPS = STEPS_GPU if gpu else STEPS_CPU
    data, vocab = build()
    # build_corpus.py removes every duplicate line across the whole corpus, so
    # unlike the previous run this split cannot leak training text into
    # validation. clean_eval.py is still the number reported on the site: it
    # compares against the trigram baseline on identical held-out sentences.
    n_val = int(len(data) * VAL_FRAC)
    train_d, val_d = data[:-n_val], data[-n_val:]

    model = TinyGPT().to(dev)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"model: {n_params/1e6:.2f}M parameters ({N_LAYER} layers, d={D_MODEL}, ctx={CONTEXT})")

    opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
    # Clamp: a short run (a smoke test, or a step budget trimmed after the fact)
    # must not ask for a warmup longer than the run itself.
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=LR, total_steps=STEPS, pct_start=min(WARMUP / STEPS, 0.3))

    # This trains in a cloud container that is reclaimed whenever the session
    # goes idle, so a fifteen-hour run will be killed and restarted several
    # times. Full training state — weights, optimizer moments, LR schedule,
    # early-stopping counters — is written every RESUME_EVERY steps and picked
    # back up here, so a restart costs a few minutes rather than the whole run.
    RESUME = CKPT / "resume.pt"
    start_step, best, since_best, best_step = 0, float("inf"), 0, 0
    if RESUME.exists():
        st = torch.load(RESUME, weights_only=False)
        if st.get("cfg") == dict(VOCAB=VOCAB, D_MODEL=D_MODEL, N_LAYER=N_LAYER,
                                 N_HEAD=N_HEAD, D_FF=D_FF, CONTEXT=CONTEXT,
                                 STEPS=STEPS):
            model.load_state_dict(st["model"]); opt.load_state_dict(st["opt"])
            sched.load_state_dict(st["sched"])
            start_step, best = st["step"], st["best"]
            since_best, best_step = st["since_best"], st["best_step"]
            print(f"resuming from step {start_step:,} (best ppl {math.exp(best):.1f} "
                  f"at step {best_step:,})")
        else:
            print("resume checkpoint is from a different run shape — starting fresh")

    def save_resume(step: int):
        tmp = RESUME.with_suffix(".tmp")
        torch.save({"model": model.state_dict(), "opt": opt.state_dict(),
                    "sched": sched.state_dict(), "step": step, "best": best,
                    "since_best": since_best, "best_step": best_step,
                    "cfg": dict(VOCAB=VOCAB, D_MODEL=D_MODEL, N_LAYER=N_LAYER,
                                N_HEAD=N_HEAD, D_FF=D_FF, CONTEXT=CONTEXT,
                                STEPS=STEPS)}, tmp)
        tmp.replace(RESUME)      # atomic: a half-written file is never loadable

    def batch(src):
        ix = torch.randint(len(src) - CONTEXT - 1, (BATCH,))
        x = torch.stack([src[i:i+CONTEXT] for i in ix])
        y = torch.stack([src[i+1:i+CONTEXT+1] for i in ix])
        if gpu:
            x, y = x.to(dev, non_blocking=True), y.to(dev, non_blocking=True)
        return x, y

    # Mixed precision roughly halves the memory and nearly doubles throughput on
    # consumer cards. On CPU it is a no-op wrapper, so the loop below stays single.
    amp = torch.autocast(device_type=dev.type, dtype=torch.float16, enabled=gpu)
    scaler = torch.amp.GradScaler(enabled=gpu)

    @torch.no_grad()
    def evaluate(src, iters=24):
        model.eval(); tot = 0.0
        for _ in range(iters):
            x, y = batch(src)
            with amp:
                tot += F.cross_entropy(model(x).view(-1, VOCAB), y.reshape(-1)).item()
        model.train(); return tot / iters

    print(f"training to {STEPS:,} steps from step {start_step:,} "
          f"(early stop patience {PATIENCE} evals)…", flush=True)
    t0 = time.time()

    def snapshot(vl: float, step: int):
        torch.save({"model": model.state_dict(), "vocab": vocab,
                    "cfg": dict(VOCAB=VOCAB, D_MODEL=D_MODEL, N_LAYER=N_LAYER, N_HEAD=N_HEAD,
                                D_FF=D_FF, CONTEXT=CONTEXT),
                    "val_loss": vl, "val_ppl": math.exp(vl), "params": n_params,
                    "step": step, "corpusTokens": len(data)},
                   CKPT / "tinygpt.pt")

    for step in range(start_step + 1, STEPS + 1):
        try:
            x, y = batch(train_d)
            with amp:
                loss = F.cross_entropy(model(x).view(-1, VOCAB), y.reshape(-1))
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            scaler.step(opt); scaler.update(); sched.step()
        except torch.cuda.OutOfMemoryError:
            # 4GB is shared with the desktop, so a browser or a game can take
            # enough to push this over. Halve the batch and carry on rather than
            # dying four hours into an overnight run.
            if BATCH <= 4:
                raise
            BATCH //= 2
            opt.zero_grad(set_to_none=True)
            torch.cuda.empty_cache()
            print(f"  out of VRAM — batch size halved to {BATCH}, continuing", flush=True)
            continue

        if step % RESUME_EVERY == 0:
            save_resume(step)

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
            save_resume(step)
            if since_best >= PATIENCE:
                print(f"\nearly stop at step {step}; best was step {best_step}")
                RESUME.unlink(missing_ok=True)      # finished; nothing to resume
                break

    print(f"\nBEST held-out loss {best:.4f} · perplexity {math.exp(best):.1f} (step {best_step})")
    print(f"saved → {CKPT/'tinygpt.pt'}")


if __name__ == "__main__":
    main()
