'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLanguageModel, useDebounced, type ModelId } from '@/lib/ml/hooks'
import comparison from '../../../public/models/comparison.json'
import { cn } from '@/lib/utils'

/**
 * Smart Compose.
 *
 * The suggestion is drawn as ghost text inline, continuing the sentence where
 * the caret is — the Gmail interaction. Getting that to line up means rendering
 * a mirror of the textarea behind it: the textarea itself is transparent and
 * only supplies the caret and the editing behaviour, while the mirror paints
 * both the typed text and the grey continuation using identical metrics.
 */

const SHARED =
  'px-4 py-3.5 font-mono text-[15px] leading-[1.7] tracking-normal whitespace-pre-wrap break-words'

const PROMPTS = [
  'I would like to',
  'thank you for your',
  'what do you',
  'it was the best',
]

const MODELS: { id: ModelId; name: string; size: string; note: string }[] = [
  { id: 'neural', name: 'Transformer', size: '5.5 MB', note: 'trained from scratch · 5.7M params' },
  { id: 'general', name: 'Trigram', size: '3.1 MB', note: 'statistical baseline · sees 2 words' },
]

export function SmartCompose({
  modelId = 'neural',
  compact = false,
  label = 'Next-word prediction',
}: {
  modelId?: ModelId
  compact?: boolean
  label?: string
}) {
  const [active, setActive] = useState<ModelId>(modelId)
  const [armed, setArmed] = useState(false)          // load only once someone engages
  const [text, setText] = useState('')
  const [accepted, setAccepted] = useState(0)
  const [latency, setLatency] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  const { data: model, loading, error, ms, bytes } = useLanguageModel(active, armed)
  const debounced = useDebounced(text, 45)

  const ghost = useMemo(() => {
    if (!model || !debounced) return ''
    const t0 = performance.now()
    const s = model.suggest(debounced, compact ? 4 : 6)
    setLatency(performance.now() - t0)
    return s
  }, [model, debounced, compact])

  // Ghost only makes sense when the caret is at the end of the text.
  const [caretAtEnd, setCaretAtEnd] = useState(true)
  const showGhost = ghost && caretAtEnd && text === debounced

  const accept = () => {
    if (!showGhost) return
    setText((t) => t + ghost)
    setAccepted((n) => n + 1)
    requestAnimationFrame(() => {
      const el = ref.current
      if (el) el.selectionStart = el.selectionEnd = el.value.length
    })
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Tab' || (e.key === 'ArrowRight' && el.selectionStart === el.value.length)) && showGhost) {
        e.preventDefault()
        accept()
      }
      if (e.key === 'Escape') setText((t) => t)
    }
    const onSel = () => setCaretAtEnd(el.selectionStart === el.value.length)
    el.addEventListener('keydown', onKey)
    el.addEventListener('selectionchange', onSel)
    el.addEventListener('click', onSel)
    el.addEventListener('keyup', onSel)
    return () => {
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('selectionchange', onSel)
      el.removeEventListener('click', onSel)
      el.removeEventListener('keyup', onSel)
    }
  }, [showGhost, ghost])

  return (
    <div className="rounded-2xl border border-line bg-ink/60 p-5 backdrop-blur md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">{label}</h3>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-mute">
            Start typing and the rest of the line appears in grey, the way Gmail does it.
            Press <Kbd>Tab</Kbd> to accept it, or just keep typing to ignore it.
          </p>
        </div>
        {model && (
          <div className="text-right font-mono text-[11px] leading-relaxed text-faint">
            <div>{describe(model)}</div>
            <div>{(bytes / 1048576).toFixed(1)} MB in {ms.toFixed(0)}ms · suggest {latency.toFixed(0)}ms</div>
          </div>
        )}
      </div>

      {!compact && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setActive(m.id); setArmed(true) }}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-left transition-colors',
                active === m.id
                  ? 'border-volt/50 bg-volt/10'
                  : 'border-line hover:border-faint',
              )}
            >
              <span className={cn('block font-mono text-[12px]', active === m.id ? 'text-volt' : 'text-bone')}>
                {m.name} <span className="text-faint">· {m.size}</span>
              </span>
              <span className="mt-0.5 block font-mono text-[10px] text-faint">{m.note}</span>
            </button>
          ))}
          <p className="ml-1 max-w-[16rem] font-mono text-[10px] leading-relaxed text-faint">
            On the same held-out text the transformer scores{' '}
            <span className="text-volt">{comparison.transformerPerplexity}</span> perplexity against the
            trigram&apos;s <span className="text-bone">{comparison.trigramPerplexity}</span> —{' '}
            {comparison.improvementPct}% better.
          </p>
        </div>
      )}

      {/* The wrapper owns the border and background; the mirror paints the text;
          the textarea sits on top fully transparent, supplying only the caret. */}
      <div className="relative rounded-xl border border-line bg-void transition-colors focus-within:border-volt/60">
        {/* mirror — paints the text and the ghost */}
        <div
          aria-hidden
          className={cn(SHARED, 'pointer-events-none absolute inset-0 overflow-hidden')}
        >
          <span className="text-bone">{text}</span>
          {showGhost && <span className="text-faint">{ghost}</span>}
          {!text && !loading && (
            <span className="text-faint">
              {armed ? 'start typing…' : 'click here to load the model and start typing…'}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          value={text}
          onFocus={() => setArmed(true)}
          onChange={(e) => setText(e.target.value)}
          rows={compact ? 3 : 4}
          spellCheck={false}
          aria-label="Type here and the model will suggest how to continue"
          className={cn(
            SHARED,
            'relative block w-full resize-none bg-transparent text-transparent caret-volt outline-none',
          )}
        />

        {showGhost && (
          <span className="pointer-events-none absolute bottom-2.5 right-3 rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-mute">
            Tab ↹
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => { setArmed(true); setText(p); ref.current?.focus() }}
            className="rounded-full border border-line px-3.5 py-2 font-mono text-[11px] text-mute transition-colors hover:border-volt/50 hover:text-bone"
          >
            {p}…
          </button>
        ))}
        {text && (
          <button
            onClick={() => { setText(''); setAccepted(0); ref.current?.focus() }}
            className="rounded-full px-3 py-2 font-mono text-[11px] text-faint transition-colors hover:text-bone"
          >
            clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {loading && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mt-4 font-mono text-[12px] text-faint"
          >
            downloading the model…
          </motion.p>
        )}
      </AnimatePresence>
      {error && <p className="mt-4 font-mono text-[12px] text-ember">model failed to load: {error}</p>}

      {!compact && model && (
        <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-faint">
          {accepted > 0 && <span className="text-volt">{accepted} suggestion{accepted > 1 ? 's' : ''} accepted · </span>}
          Everything here runs on your device — the model file is the only thing that crosses the
          network, and only after you click into the box.
        </p>
      )}
    </div>
  )
}

/** One line of provenance for whichever model is loaded. */
function describe(m: unknown): string {
  if (m && typeof m === 'object' && 'arch' in m) {
    const a = (m as { arch: { nLayer: number; dModel: number; context: number }; training: { params: number; valPerplexity: number } })
    return `${(a.training.params / 1e6).toFixed(1)}M params · ${a.arch.nLayer} layers · ${a.arch.context}-word context`
  }
  if (m && typeof m === 'object' && 'stats' in m) {
    const s = (m as { stats: { vocabSize: number; trigramContexts: number } }).stats
    return `${s.vocabSize.toLocaleString()} words · ${s.trigramContexts.toLocaleString()} contexts`
  }
  return ''
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-bone">
      {children}
    </kbd>
  )
}
