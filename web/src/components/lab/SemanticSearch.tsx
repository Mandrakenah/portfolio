'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { useSearch } from '@/lib/ml/hooks'
import { cn } from '@/lib/utils'

const EXAMPLES = [
  'does he write tests',
  'cloud deployment',
  'typescrpt',
  'leadership',
  'database schema design',
  'neural networks',
]

const KIND_STYLE: Record<string, string> = {
  role: 'border-volt/40 bg-volt/10 text-volt',
  project: 'border-plasma/40 bg-plasma/10 text-plasma',
  skill: 'border-line bg-elevated text-mute',
  education: 'border-line bg-elevated text-mute',
}

export function SemanticSearch() {
  const { data: engine, loading, error, ms } = useSearch()
  const [q, setQ] = useState('')
  const [latency, setLatency] = useState(0)

  const hits = useMemo(() => {
    if (!engine || !q.trim()) return []
    const t0 = performance.now()
    const r = engine.search(q, 7)
    setLatency(performance.now() - t0)
    return r
  }, [engine, q])

  return (
    <div className="rounded-2xl border border-line bg-ink/60 p-5 backdrop-blur md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Search my work</h3>
          <p className="mt-1.5 max-w-md text-[13px] text-mute">
            BM25 over every claim in my corpus, expanded through a concept map and corrected for typos.
            Ask it a question, not a keyword.
          </p>
        </div>
        {engine && (
          <div className="font-mono text-[10px] leading-relaxed text-faint">
            <div>{engine.size} documents · {engine.termCount} terms</div>
            <div>index {ms.toFixed(0)}ms · query {latency.toFixed(2)}ms</div>
          </div>
        )}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="has he shipped production TypeScript?"
        aria-label="Search Arjun's work"
        className="w-full rounded-xl border border-line bg-void px-4 py-3.5 font-mono text-[14px] text-bone outline-none transition-colors placeholder:text-faint focus:border-volt/60"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            onClick={() => setQ(e)}
            className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mute transition-colors hover:border-volt/50 hover:text-bone"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {loading && <p className="font-mono text-[12px] text-faint">building index…</p>}
        {error && <p className="font-mono text-[12px] text-ember">index failed: {error}</p>}
        <AnimatePresence mode="popLayout">
          {hits.map((h, i) => {
            const isProject = h.doc.sourceKind === 'project'
            const Body = (
              <>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider', KIND_STYLE[h.doc.sourceKind])}>
                    {h.doc.sourceKind}
                  </span>
                  <span className="font-mono text-[10px] text-mute">{h.doc.sourceLabel}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="h-1 w-16 overflow-hidden rounded-full bg-elevated">
                      <motion.span
                        className="block h-full rounded-full bg-volt"
                        initial={{ width: 0 }}
                        animate={{ width: `${h.strength * 100}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </span>
                    <span className="w-8 text-right font-mono text-[10px] text-faint">
                      {(h.strength * 100).toFixed(0)}
                    </span>
                  </span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-bone">{h.doc.text}</p>
                {h.matchedTerms.length > 0 && (
                  <p className="mt-2 font-mono text-[10px] text-faint">
                    matched: {h.matchedTerms.slice(0, 6).join(' · ')}
                  </p>
                )}
              </>
            )
            return (
              <motion.div
                key={h.doc.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, delay: i * 0.03 }}
              >
                {isProject ? (
                  <Link
                    href={`/work/${h.doc.sourceId}`}
                    className="block rounded-xl border border-line bg-void/70 p-4 transition-colors hover:border-volt/40"
                  >
                    {Body}
                  </Link>
                ) : (
                  <div className="rounded-xl border border-line bg-void/70 p-4">{Body}</div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        {!loading && q.trim() && hits.length === 0 && (
          <p className="font-mono text-[12px] text-faint">
            Nothing in my corpus matches that. Which is itself an answer.
          </p>
        )}
      </div>
    </div>
  )
}
