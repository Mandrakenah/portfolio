'use client'

import { Reveal, RevealWords } from '@/components/motion/Reveal'
import { roles } from '@/content/experience'

export function Experience() {
  return (
    <section className="relative border-t border-line px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-volt uppercase">03 — Experience</p>
        </Reveal>
        <h2 className="mb-16 text-[clamp(1.9rem,4.5vw,3.4rem)] font-medium leading-[1.03] tracking-[-0.03em] md:mb-24">
          <RevealWords text="Where the work happened." />
        </h2>

        <div className="space-y-16 md:space-y-24">
          {roles.map((r, i) => (
            <Reveal key={r.id} delay={i * 0.06}>
              <article className="grid gap-6 border-t border-line pt-8 md:grid-cols-[1fr_2fr] md:gap-16">
                <header>
                  <p className="font-mono text-[11px] text-volt">
                    {r.start} — {r.end}
                  </p>
                  <h3 className="mt-2.5 text-[clamp(1.25rem,2.4vw,1.75rem)] font-medium leading-tight tracking-[-0.02em]">
                    {r.company}
                  </h3>
                  <p className="mt-1 text-[14px] text-mute">{r.title}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {r.stack.map((s) => (
                      <span key={s} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-faint">
                        {s}
                      </span>
                    ))}
                  </div>
                </header>

                <div>
                  <p className="mb-6 text-[15px] leading-relaxed text-bone md:text-[16px]">{r.summary}</p>
                  <ul className="space-y-3.5">
                    {r.bullets.map((b, bi) => (
                      <li key={bi} className="flex gap-3.5 text-[14px] leading-relaxed text-mute">
                        <span className="mt-[9px] h-px w-4 shrink-0 bg-faint" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
