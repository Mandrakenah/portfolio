import type { Metadata } from 'next'
import { SystemPanel } from '@/components/system/SystemPanel'
import { HowItWorks } from '@/components/system/HowItWorks'
import { Footer } from '@/components/chrome/Footer'
import meta from '../../../public/models/meta.json'
import comparison from '../../../public/models/comparison.json'
import tinygpt from '../../../public/models/tinygpt.json'
import corpus from '../../../public/models/corpus-stats.json'

export const metadata: Metadata = {
  title: 'System',
  description: 'How this site is built: the training pipeline, the shipped model artifacts, and live measurements taken on your device.',
}

// int8 weights + the float32 layer-norm gains, straight off the shipped artifact.
const WEIGHT_MB = (
  tinygpt.tensors.reduce((max, t) => Math.max(max, t.offset + t.bytes), 0) / 1048576
).toFixed(1)

const PIPELINE = [
  { stage: 'content', detail: 'Typed TypeScript modules — every claim about my work, in one source of truth', tech: 'TypeScript' },
  { stage: 'export', detail: 'Flattened into an evidence corpus and a writing corpus', tech: 'tsx script' },
  { stage: 'train', detail: 'Kneser-Ney n-gram model, BM25 index, TF-IDF → SVD projection', tech: 'Python · NumPy · scikit-learn' },
  { stage: 'ship', detail: 'Compact JSON artifacts written into the static bundle', tech: meta.totalHuman },
  { stage: 'infer', detail: 'Prediction, retrieval and matching, all in the visitor’s browser', tech: 'Your device' },
]

export default function SystemPage() {
  return (
    <main id="main">
      <section className="px-5 pb-16 pt-36 md:px-10 md:pb-20 md:pt-44">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-volt">System</p>
          <h1 className="max-w-3xl text-[clamp(2.1rem,6vw,4.4rem)] font-medium leading-[0.98] tracking-[-0.035em]">
            How it is actually built.
          </h1>
          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-mute">
            Portfolios usually show an architecture diagram of a system nobody can inspect. These numbers
            are live: the round trip below is a real request to a real endpoint, and the benchmarks were
            measured on the device you are reading this on.
          </p>
        </div>
      </section>

      <section className="px-5 pb-16 md:px-10">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Pipeline</h2>
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-5">
            {PIPELINE.map((s, i) => (
              <li key={s.stage} className="relative bg-ink p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded bg-volt font-mono text-[11px] font-bold text-void">
                    {i + 1}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-bone">{s.stage}</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-mute">{s.detail}</p>
                <p className="mt-3 font-mono text-[11px] text-volt">{s.tech}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-16 md:px-10">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
            The transformer
          </h2>
          <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
              <p className="text-[15px] leading-relaxed text-bone">
                A decoder-only transformer — {(tinygpt.training.params / 1e6).toFixed(1)}M parameters,{' '}
                {tinygpt.arch.nLayer} layers, {tinygpt.arch.context}-word context — defined and trained
                from scratch on {(corpus.words / 1e6).toFixed(1)}M words of English. Not fine-tuned, not
                downloaded.
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-mute">
                The inference that runs it in your browser is hand-written too: roughly 250 lines of
                TypeScript over <code className="font-mono text-[13px] text-volt">Float32Array</code>,
                doing the attention and the feed-forward passes directly. No ONNX runtime, no WASM
                blob, no third-party library. The weights ship as int8 with one scale per tensor, which
                is what gets {(tinygpt.training.params * 4 / 1e6).toFixed(0)} MB of float32 down to {WEIGHT_MB} MB.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-5 font-mono text-[12px]">
                {[
                  ['parameters', `${(tinygpt.training.params / 1e6).toFixed(2)}M`],
                  ['layers / heads', `${tinygpt.arch.nLayer} / ${tinygpt.arch.nHead}`],
                  ['context window', `${tinygpt.arch.context} words`],
                  ['vocabulary', tinygpt.arch.vocabSize.toLocaleString()],
                  ['held-out perplexity', String(tinygpt.training.valPerplexity)],
                  ['weights', `${WEIGHT_MB} MB int8`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-faint">{k}</dt>
                    <dd className="text-bone">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
                  Measured against the baseline
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">
                  Same vocabulary, same tokenisation, same {comparison.heldOutSentences.toLocaleString()}
                  held-out sentences — and every one of them appears exactly once in the corpus, so
                  neither model has seen it before. Anything less is marketing.
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    ['Transformer', comparison.transformerPerplexity, true],
                    ['Kneser-Ney trigram', comparison.trigramPerplexity, false],
                  ].map(([name, ppl, win]) => (
                    <div key={String(name)}>
                      <div className="mb-1 flex items-baseline justify-between font-mono text-[12px]">
                        <span className={win ? 'text-volt' : 'text-mute'}>{name}</span>
                        <span className="text-bone">{ppl}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                        <div
                          className={`h-full rounded-full ${win ? 'bg-volt' : 'bg-faint'}`}
                          style={{ width: `${(Number(ppl) / comparison.trigramPerplexity) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 font-mono text-[11px] text-faint">
                  {comparison.improvementPct}% lower perplexity. The trigram sees two words; the
                  transformer sees {comparison.transformerContext}.
                </p>
              </div>

              <div className="rounded-2xl border border-ember/30 bg-ember/[0.04] p-6">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ember">
                  What it could not do
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">
                  I tried using the same network as the search engine — one model for everything. The
                  first attempt failed badly: trained only on novels and news, it knew{' '}
                  <span className="text-bone">none of the fifteen technical terms</span> this site is
                  about, so its sense of which projects resemble each other was worthless.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-mute">
                  Adding software documentation to the corpus fixed the diagnosis —{' '}
                  <span className="text-bone">13 of 15</span> now — and on some queries it finds
                  exactly the right evidence. It still loses to BM25 overall, so search stays on BM25.
                  Using the more impressive model where the plain one wins would be vanity, not
                  engineering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-10 md:pb-32">
        <div className="mx-auto max-w-[1100px]">
          <SystemPanel />
        </div>
      </section>
      <HowItWorks />
      <Footer />
    </main>
  )
}
