'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePredictor } from '@/lib/ml/hooks'
import type { Prediction } from '@/lib/ml/types'
import { cn } from '@/lib/utils'

const SEEDS = [
  'I built',
  'The hardest part was',
  'I care about the',
  'Each migrated component',
  'A model that never',
]

const ORDER_META: Record<number, { label: string; cls: string; hint: string }> = {
  3: { label: 'trigram', cls: 'text-volt border-volt/40 bg-volt/10', hint: 'matched the last two words' },
  2: { label: 'bigram', cls: 'text-plasma border-plasma/40 bg-plasma/10', hint: 'backed off to the last word' },
  1: { label: 'unigram', cls: 'text-mute border-line bg-elevated', hint: 'no context match — using base frequency' },
}

export function PredictorDemo({ compact = false }: { compact?: boolean }) {
  const { data: model, loading, error, ms } = usePredictor()
  const [text, setText] = useState('I built ')
  const [latency, setLatency] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const preds: Prediction[] = useMemo(() => {
    if (!model) return []
    const t0 = performance.now()
    const p = model.predict(text, 5)
    setLatency(performance.now() - t0)
    return p
  }, [model, text])

  const top = preds[0]

  // Tab accepts the top suggestion — the interaction people already know
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && top) {
        e.preventDefault()
        setText((t) => (t.endsWith(' ') ? t : t.replace(/[A-Za-z0-9'\-.]*$/, '')) + top.word + ' ')
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [top])

  const accept = (w: string) =>
    setText((t) => (t.endsWith(' ') ? t : t.replace(/[A-Za-z0-9'\-.]*$/, '')) + w + ' ')

  return (
    <div className="rounded-2xl border border-line bg-ink/60 p-5 backdrop-blur md:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-[11px] tracking-[0.2em] text-volt uppercase">Next-word prediction</h3>
          <p className="mt-1.5 text-[13px] text-mute">
            Kneser-Ney trigram model trained on my own writing. Press <kbd className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-bone">Tab</kbd> to accept.
          </p>
        </div>
        {model && (
          <div className="font-mono text-[11px] leading-relaxed text-faint">
            <div>{model.stats.vocabSize.toLocaleString()} vocab · {model.stats.trigramContexts.toLocaleString()} contexts</div>
            <div>loaded in {ms.toFixed(0)}ms · predict {latency.toFixed(2)}ms</div>
          </div>
        )}
      </div>

      <div className="relative">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={compact ? 2 : 3}
          spellCheck={false}
          aria-label="Type to see the model predict the next word"
          className="w-full resize-none rounded-xl border border-line bg-void px-4 py-3.5 font-mono text-[15px] leading-relaxed text-bone outline-none transition-colors placeholder:text-faint focus:border-volt/60"
          placeholder="start typing…"
        />
        {top && !loading && (
          <span className="pointer-events-none absolute bottom-3.5 right-4 font-mono text-[11px] text-faint">
            → <span className="text-volt">{top.word}</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setText(s + ' ')}
            className="rounded-full border border-line px-3.5 py-2 font-mono text-[11px] text-mute transition-colors hover:border-volt/50 hover:text-bone"
          >
            {s}…
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-1.5">
        {loading && <p className="font-mono text-[12px] text-faint">loading model…</p>}
        {error && <p className="font-mono text-[12px] text-ember">model failed: {error}</p>}
        <AnimatePresence mode="popLayout">
          {preds.map((p, i) => {
            const meta = ORDER_META[p.order]
            return (
              <motion.button
                key={p.word}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, delay: i * 0.02 }}
                onClick={() => accept(p.word)}
                title={meta.hint}
                className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-elevated"
              >
                <span className="w-28 shrink-0 truncate font-mono text-[13px] text-bone group-hover:text-volt md:w-36">
                  {p.word}
                </span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                  <motion.span
                    className={cn('absolute inset-y-0 left-0 rounded-full', p.order === 3 ? 'bg-volt' : p.order === 2 ? 'bg-plasma' : 'bg-faint')}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(p.share * 100, 2)}%` }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
                <span className="w-11 shrink-0 text-right font-mono text-[11px] text-mute">
                  {(p.share * 100).toFixed(0)}%
                </span>
                <span className={cn('shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', meta.cls)}>
                  {meta.label}
                </span>
              </motion.button>
            )
          })}
        </AnimatePresence>
        {!loading && !error && preds.length === 0 && (
          <p className="font-mono text-[12px] text-faint">no continuation for that context — try a space, or a different phrase</p>
        )}
      </div>

      {!compact && model && (
        <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-faint">
          Colour shows which order of the model produced each word: the{' '}
          <span className="text-volt">trigram</span> matched my last two words, the{' '}
          <span className="text-plasma">bigram</span> backed off to one, and grey means it fell all the way
          back to base word frequency. Held-out perplexity {model.stats.perplexityHeldOut} on a 90/10 split —
          honest for {model.stats.tokensSeen.toLocaleString()} training tokens.
        </p>
      )}
    </div>
  )
}
