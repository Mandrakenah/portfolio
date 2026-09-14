import type { Metadata } from 'next'
import { PredictorDemo } from '@/components/lab/PredictorDemo'
import { SemanticSearch } from '@/components/lab/SemanticSearch'
import { Constellation } from '@/components/lab/Constellation'
import { Footer } from '@/components/chrome/Footer'

export const metadata: Metadata = {
  title: 'Lab',
  description:
    'A language model trained on my own writing, a retrieval index over my work, and a semantic map of my projects — all running in your browser.',
}

export default function LabPage() {
  return (
    <main>
      <section className="px-5 pb-16 pt-36 md:px-10 md:pb-20 md:pt-44">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-volt">The Lab</p>
          <h1 className="max-w-3xl text-[clamp(2.1rem,6vw,4.4rem)] font-medium leading-[0.98] tracking-[-0.035em]">
            Models I trained,
            <br />
            <span className="text-mute">running on your device.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-mute">
            Three pieces of machine learning, none of them an API call. A Python pipeline builds the
            artifacts at deploy time; your browser loads about 145 KB and does the rest. Open the network
            tab if you do not believe me.
          </p>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-10 md:pb-32">
        <div className="mx-auto grid max-w-[1100px] gap-6">
          <PredictorDemo />
          <SemanticSearch />
          <Constellation />
        </div>
      </section>
      <Footer />
    </main>
  )
}
