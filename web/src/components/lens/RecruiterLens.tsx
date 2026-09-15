'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSearch } from '@/lib/ml/hooks'
import { matchJobDescription, type MatchReport, type Requirement } from '@/lib/ml/matcher'
import { buildLexicon } from '@/content/corpus'
import { saveIntent, guessRoleTitle } from '@/lib/adaptive'
import { cn } from '@/lib/utils'

const SAMPLE = `Software Developer Intern — Winter 2027

Responsibilities:
- Develop and maintain features in a React and TypeScript codebase
- Build REST APIs using Node.js and Express
- Write unit and integration tests to ensure code quality
- Collaborate with designers and product managers in an Agile environment
- Participate in code reviews and contribute to technical documentation

Requirements:
- Currently enrolled in a Computer Science or Software Engineering program
- Strong knowledge of JavaScript, HTML and CSS
- Experience with a relational database such as PostgreSQL
- Familiarity with Docker and Kubernetes is a plus
- Exposure to machine learning frameworks such as PyTorch is an asset`

const VERDICT = {
  strong: { label: 'Strong', bar: 'bg-volt', text: 'text-volt', ring: 'border-volt/40 bg-volt/10' },
  partial: { label: 'Partial', bar: 'bg-plasma', text: 'text-plasma', ring: 'border-plasma/40 bg-plasma/10' },
  gap: { label: 'Gap', bar: 'bg-ember', text: 'text-ember', ring: 'border-ember/40 bg-ember/10' },
} as const

function Gauge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const C = 2 * Math.PI * 52
  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <motion.circle
          cx="60" cy="60" r="52" fill="none" stroke="var(--color-volt)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - C * value }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="text-center">
        <motion.div
          className="font-mono text-[30px] leading-none text-bone"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        >
          {pct}<span className="text-[16px] text-mute">%</span>
        </motion.div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">coverage</div>
      </div>
    </div>
  )
}

function RequirementRow({ r, i }: { r: Requirement; i: number }) {
  const [open, setOpen] = useState(false)
  const v = VERDICT[r.verdict]
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(i * 0.045, 0.5), ease: [0.16, 1, 0.3, 1] }}
      className="border-b border-line"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-elevated/40"
        aria-expanded={open}
      >
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', v.bar)} />
        <span className="flex-1 text-[14px] leading-relaxed text-bone">{r.text}</span>
        <span className={cn('shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', v.ring, v.text)}>
          {v.label}
        </span>
        <span className={cn('shrink-0 font-mono text-[11px] text-faint transition-transform', open && 'rotate-90')}>›</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-5 pl-6">
              {r.adjacentTech.length > 0 && (
                <p className="font-mono text-[11px] text-plasma">
                  Closest I have:{' '}
                  {r.adjacentTech.map((a) => `${a.via} (not ${a.tech})`).join(', ')}
                </p>
              )}
              {r.missingTech.length > 0 && (
                <p className="font-mono text-[11px] text-ember">
                  Not in my corpus: {r.missingTech.join(', ')}
                </p>
              )}
              {r.evidence.length === 0 && r.missingTech.length === 0 && (
                <p className="font-mono text-[11px] text-faint">
                  Nothing in my work answers this line. That is the honest answer.
                </p>
              )}
              {r.evidence.map((e) => (
                <div key={e.doc.id} className="rounded-lg border border-line bg-ink/60 p-3.5">
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-volt">{e.doc.sourceLabel}</p>
                  <p className="text-[13px] leading-relaxed text-mute">{e.doc.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

export function RecruiterLens() {
  const { data: engine, loading } = useSearch()
  const [jd, setJd] = useState('')
  const [report, setReport] = useState<MatchReport | null>(null)
  const lexicon = useMemo(() => buildLexicon(), [])

  const run = (text: string) => {
    if (!engine || !text.trim()) return
    const r = matchJobDescription(text, engine, lexicon)
    setReport(r)

    // Rank projects by how much evidence they contributed to this posting,
    // then let the rest of the site reorder itself around that.
    const weight = new Map<string, number>()
    const add = (id: string, w: number) => weight.set(id, (weight.get(id) ?? 0) + w)

    // signal 1 — evidence actually cited for each requirement (highest confidence)
    for (const req of r.requirements) {
      for (const e of req.evidence) {
        if (e.doc.sourceKind !== 'project') continue
        add(e.doc.sourceId, (req.verdict === 'strong' ? 1 : 0.5) * e.strength)
      }
    }

    // signal 2 — a deeper pass over the whole posting, so a project that is
    // broadly relevant still rises even when it never won a single line
    for (const h of engine.search(text, 30)) {
      if (h.doc.sourceKind !== 'project') continue
      add(h.doc.sourceId, h.strength * 0.45)
    }
    saveIntent({
      label: guessRoleTitle(text),
      ranking: [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id),
      matched: r.matchedTech,
      at: Date.now(),
    })
  }

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-line bg-ink/60 p-5 backdrop-blur md:p-7">
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={9}
          placeholder="Paste the job posting here…"
          aria-label="Job description"
          className="w-full resize-y rounded-xl border border-line bg-void px-4 py-3.5 font-mono text-[13px] leading-relaxed text-bone outline-none transition-colors placeholder:text-faint focus:border-volt/60"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => run(jd)}
            disabled={loading || !jd.trim()}
            className="rounded-full bg-volt px-5 py-2.5 font-mono text-[12px] font-medium text-void transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {loading ? 'loading index…' : 'Analyse posting'}
          </button>
          <button
            onClick={() => { setJd(SAMPLE); run(SAMPLE) }}
            className="rounded-full border border-line px-5 py-2.5 font-mono text-[12px] text-mute transition-colors hover:border-volt/50 hover:text-bone"
          >
            Try a sample posting
          </button>
          {report && (
            <span className="font-mono text-[11px] text-faint">
              {report.requirements.length} requirements scored in {report.ms.toFixed(0)}ms, on your device
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-7 rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur md:flex-row md:items-center md:gap-10 md:p-8">
              <Gauge value={report.overall} />
              <div className="flex-1 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  {([['strong', report.strong], ['partial', report.partial], ['gap', report.gaps]] as const).map(
                    ([k, n]) => (
                      <div key={k}>
                        <div className={cn('font-mono text-[26px] leading-none', VERDICT[k].text)}>{n}</div>
                        <div className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">
                          {VERDICT[k].label}
                        </div>
                      </div>
                    ),
                  )}
                </div>
                <p className="max-w-lg text-[13px] leading-relaxed text-mute">
                  Coverage counts a strong match as one point and a partial as a half. It is deliberately
                  conservative: a line only scores strongly when the overlap uses terms that are rare in my
                  corpus, or names a technology I can actually evidence.
                </p>
                {report.missingTech.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-faint">Not in my corpus</span>
                    {report.missingTech.map((t) => (
                      <span key={t} className="rounded-full border border-ember/40 bg-ember/10 px-2.5 py-0.5 font-mono text-[11px] text-ember">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
                Line by line
              </h2>
              <p className="mb-5 text-[13px] text-faint">Click any requirement to see the evidence behind the verdict.</p>
              <ul className="border-t border-line">
                {report.requirements.map((r, i) => (
                  <RequirementRow key={r.id} r={r} i={i} />
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
