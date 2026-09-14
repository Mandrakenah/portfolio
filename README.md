# arjunsaji.dev

A portfolio that runs its own NLP models in the visitor's browser.

Every intelligent feature here is trained from scratch on my own content and executed
client-side. There are no API keys, no third-party model calls, and no per-request cost.
Total shipped model weight: **~146 KB**.

---

## What it does

| Feature | What it actually is |
|---|---|
| **Next-word prediction** (`/lab`) | Interpolated modified Kneser-Ney trigram language model trained on my own prose. Backs off trigram → bigram → unigram and shows which order fired. |
| **Semantic search** (`/lab`) | BM25 over 65 evidence documents, expanded through a curated concept map, with character-3-gram query correction for typos. |
| **Semantic space** (`/lab`) | TF-IDF vectors reduced by truncated SVD, relaxed with a force-directed pass, rendered in WebGL. |
| **Recruiter Lens** (`/lens`) | Extracts requirement lines from a job posting and scores each against the evidence corpus — including a technology veto that reports gaps rather than inflating the match. |
| **Adaptive ordering** | After a Lens run, the work list re-ranks itself around what that posting cared about. Stored in `sessionStorage`; never transmitted. |
| **Live system page** (`/system`) | Real API round trip, real model benchmarks measured on the visitor's device, real artifact sizes. |

## Architecture

```
content (TypeScript)  →  corpus.json  →  Python training  →  public/models/*.json  →  browser
   one source of truth    export step      n-gram + BM25 + SVD     ~146 KB total       inference
```

Content lives in `web/src/content` as typed modules. It is the single source of truth:
the pages render from it, and the models are trained from it. A claim cannot appear on
the site without also being searchable and matchable.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · **Motion** · **Lenis** · **three.js / react-three-fiber**
- **Python** · NumPy · scikit-learn (build-time training only)

## Running it

```bash
cd web
npm install
npm run dev
```

### Retraining the models

Needed after editing anything in `web/src/content`:

```bash
python3 -m venv .venv && source .venv/bin/activate    # from the repo root
pip install -r ml/requirements.txt
cd web && npm run models
```

This exports the corpus, trains the language model, builds the retrieval index and the
semantic projection, and writes the artifacts into `web/public/models/`. They are
committed to the repo, so deployment does not need Python.

### Verifying

```bash
npm run build
npm run start          # in one shell
npm run verify         # in another — accessibility, console errors, mobile overflow
```

## Deployment

Vercel, from `web/` as the project root. No environment variables are required.
The model artifacts are committed, so the build is a plain `next build`.

## A note on honesty

The language model reports held-out perplexity (390) alongside training perplexity (3.7).
The gap is what overfitting a 2,200-word corpus looks like, and hiding it would defeat the
point of the page. Likewise the Recruiter Lens is built to report gaps: a matcher that
rates every candidate a 98% fit is a horoscope, not a tool.
