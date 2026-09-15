'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useEffect } from 'react'
import { Reveal, RevealWords } from '@/components/motion/Reveal'
import { projects } from '@/content/projects'
import { readIntent, type Intent } from '@/lib/adaptive'
import { AdaptiveBanner } from '@/components/chrome/AdaptiveBanner'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<string, string> = {
  ml: 'Machine learning',
  product: 'Product',
  tool: 'Developer tool',
  academic: 'Academic',
}

export function Work() {
  const [hover, setHover] = useState<string | null>(null)
  const [intent, setIntent] = useState<Intent | null>(null)

  useEffect(() => {
    const sync = () => setIntent(readIntent())
    sync()
    window.addEventListener('intent:change', sync)
    return () => window.removeEventListener('intent:change', sync)
  }, [])

  // Rank by what the visitor told us they care about, falling back to my order.
  const ordered = intent
    ? [...projects].sort((a, b) => {
        const ia = intent.ranking.indexOf(a.id)
        const ib = intent.ranking.indexOf(b.id)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
    : projects

  return (
    <section id="work" className="relative border-t border-line px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-volt uppercase">02 — Selected work</p>
        </Reveal>
        <h2 className="mb-16 text-[clamp(1.9rem,4.5vw,3.4rem)] font-medium leading-[1.03] tracking-[-0.03em] md:mb-24">
          <RevealWords text="Things I have actually shipped." />
        </h2>

        <AdaptiveBanner />

        <ul className="border-t border-line" onMouseLeave={() => setHover(null)}>
          {ordered.map((p, i) => (
            <li key={p.id}>
              <Reveal delay={Math.min(i * 0.05, 0.3)} y={18}>
                <Link
                  href={`/work/${p.id}`}
                  onMouseEnter={() => setHover(p.id)}
                  className={cn(
                    'group relative flex flex-col gap-3 border-b border-line py-7 transition-opacity duration-300 md:flex-row md:items-baseline md:gap-8 md:py-9',
                    hover && hover !== p.id ? 'opacity-35' : 'opacity-100',
                  )}
                >
                  <span className="font-mono text-[11px] text-faint md:w-12">{String(i + 1).padStart(2, '0')}</span>

                  <div className="flex-1">
                    <h3 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.4rem,3.2vw,2.4rem)] font-medium leading-tight tracking-[-0.025em] transition-colors group-hover:text-volt">
                      {p.name}
                      {p.status === 'live' && (
                        <span className="rounded-full border border-volt/40 bg-volt/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-volt">
                          live
                        </span>
                      )}
                    </h3>
                    <p className="mt-1.5 max-w-lg text-[14px] text-mute">{p.tagline}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:w-[38%] md:justify-end">
                    {p.stack.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] text-mute">
                        {s}
                      </span>
                    ))}
                    {p.stack.length > 4 && (
                      <span className="px-1 py-0.5 font-mono text-[11px] text-faint">+{p.stack.length - 4}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 font-mono text-[11px] text-faint md:w-32 md:justify-end">
                    <span>{KIND_LABEL[p.kind]}</span>
                    <motion.span
                      animate={{ x: hover === p.id ? 4 : 0 }}
                      className="text-volt opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      →
                    </motion.span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
