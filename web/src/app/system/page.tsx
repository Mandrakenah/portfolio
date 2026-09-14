import type { Metadata } from 'next'
import { SystemPanel } from '@/components/system/SystemPanel'
import { Footer } from '@/components/chrome/Footer'

export const metadata: Metadata = {
  title: 'System',
  description: 'How this site is built: the training pipeline, the shipped model artifacts, and live measurements taken on your device.',
}

const PIPELINE = [
  { stage: 'content', detail: 'Typed TypeScript modules — every claim about my work, in one source of truth', tech: 'TypeScript' },
  { stage: 'export', detail: 'Flattened into an evidence corpus and a writing corpus', tech: 'tsx script' },
  { stage: 'train', detail: 'Kneser-Ney n-gram model, BM25 index, TF-IDF → SVD projection', tech: 'Python · NumPy · scikit-learn' },
  { stage: 'ship', detail: 'Compact JSON artifacts written into the static bundle', tech: '≈146 KB' },
  { stage: 'infer', detail: 'Prediction, retrieval and matching, all in the visitor’s browser', tech: 'Your device' },
]

export default function SystemPage() {
  return (
    <main>
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
                  <span className="grid h-5 w-5 place-items-center rounded bg-volt font-mono text-[10px] font-bold text-void">
                    {i + 1}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-bone">{s.stage}</span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-mute">{s.detail}</p>
                <p className="mt-3 font-mono text-[10px] text-volt">{s.tech}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-10 md:pb-32">
        <div className="mx-auto max-w-[1100px]">
          <SystemPanel />
        </div>
      </section>
      <Footer />
    </main>
  )
}
