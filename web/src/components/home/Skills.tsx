'use client'

import { motion } from 'motion/react'
import { Reveal } from '@/components/motion/Reveal'
import { skillGroups } from '@/content/skills'

export function Skills() {
  return (
    <section className="relative border-t border-line px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-volt uppercase">04 — Capability</p>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mb-14 max-w-lg font-mono text-[12px] leading-relaxed text-faint md:mb-20">
            Three bars means I have built production work with it. Two means working proficiency.
            One means familiar. I would rather you know the difference before the interview than during it.
          </p>
        </Reveal>

        <div className="grid gap-x-14 gap-y-14 md:grid-cols-2 lg:grid-cols-4">
          {skillGroups.map((g, gi) => (
            <Reveal key={g.id} delay={gi * 0.08}>
              <h3 className="mb-6 border-b border-line pb-3 font-mono text-[11px] tracking-[0.2em] text-bone uppercase">
                {g.label}
              </h3>
              <ul className="space-y-4">
                {g.items.map((s, i) => (
                  <li key={s.name}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-bone">{s.name}</span>
                      <span className="flex gap-1" aria-label={`level ${s.level} of 3`}>
                        {[1, 2, 3].map((n) => (
                          <motion.span
                            key={n}
                            initial={{ opacity: 0, scaleY: 0.3 }}
                            whileInView={{ opacity: 1, scaleY: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: gi * 0.06 + i * 0.03 + n * 0.04 }}
                            className={`block h-3 w-[3px] rounded-full ${n <= s.level ? 'bg-volt' : 'bg-line'}`}
                          />
                        ))}
                      </span>
                    </div>
                    {s.note && <p className="mt-1 pr-12 text-[12px] leading-snug text-faint">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
