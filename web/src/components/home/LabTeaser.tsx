'use client'

import Link from 'next/link'
import { Reveal, RevealWords } from '@/components/motion/Reveal'
import { PredictorDemo } from '@/components/lab/PredictorDemo'

export function LabTeaser() {
  return (
    <section className="relative overflow-hidden border-t border-line px-5 py-28 md:px-10 md:py-40">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-plasma/8 blur-[140px]" />

      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-12 md:grid-cols-[1fr_1.25fr] md:gap-20">
          <div className="md:sticky md:top-32 md:self-start">
            <Reveal>
              <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-volt uppercase">05 — The lab</p>
            </Reveal>
            <h2 className="text-[clamp(1.9rem,4.5vw,3.4rem)] font-medium leading-[1.03] tracking-[-0.03em]">
              <RevealWords text="The models are mine, and they run on your device." />
            </h2>
            <Reveal delay={0.15}>
              <p className="mt-7 max-w-md text-[15px] leading-relaxed text-mute">
                Most portfolios that advertise AI are a text box wired to somebody else&apos;s API.
                This one ships a language model trained on my own writing, a retrieval index built
                from my own work, and a matcher that will tell a recruiter where I fall short.
                Nothing leaves your browser.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/lab"
                  className="rounded-full bg-volt px-5 py-2.5 font-mono text-[12px] font-medium text-void transition-opacity hover:opacity-90"
                >
                  Full lab →
                </Link>
                <Link
                  href="/system"
                  className="rounded-full border border-line px-5 py-2.5 font-mono text-[12px] text-bone transition-colors hover:border-volt hover:text-volt"
                >
                  How it is built
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} y={36}>
            <PredictorDemo compact />
          </Reveal>
        </div>
      </div>
    </section>
  )
}
