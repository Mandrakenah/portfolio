import type { LmModel, Prediction } from './types'

const TOKEN_RE = /[A-Za-z][A-Za-z0-9'\-.]*|[0-9]+(?:\.[0-9]+)?%?|[.,;:!?]/g
const BOS = '<s>'

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN_RE) ?? []).map((t) =>
    t.endsWith('.') && t.length > 2 && t !== 'next.js' ? t.slice(0, -1) : t,
  )
}

/**
 * Next-word prediction against the Kneser-Ney trigram model trained on
 * Arjun's writing. Backs off trigram → bigram → unigram and reports which
 * order fired, because that is the part worth showing a visitor.
 */
export class Predictor {
  private m: LmModel
  private idx: Map<string, number>

  constructor(model: LmModel) {
    this.m = model
    this.idx = new Map(model.vocab.map((w, i) => [w, i]))
  }

  get stats() {
    return this.m.stats
  }

  /** true when the user is mid-word — we then complete rather than predict. */
  private static trailingPartial(text: string): string {
    const m = text.match(/([A-Za-z][A-Za-z0-9'\-.]*)$/)
    return m ? m[1].toLowerCase() : ''
  }

  predict(text: string, k = 5): Prediction[] {
    const raw = this.candidates(text, k)
    if (raw.length > 0) return raw

    // The visitor has typed a complete word that nothing extends ("I built").
    // Completing is the wrong mode here — predict what comes NEXT instead of
    // showing them an empty box.
    const partial = Predictor.trailingPartial(text)
    if (partial && this.idx.has(partial)) return this.candidates(text + ' ', k)
    return raw
  }

  private candidates(text: string, k: number): Prediction[] {
    const partial = Predictor.trailingPartial(text)
    const complete = partial.length > 0 && !/\s$/.test(text)
    const body = complete ? text.slice(0, text.length - partial.length) : text
    const toks = tokenize(body)

    const ctx = [BOS, BOS, ...toks].slice(-2)
    const w1 = this.idx.get(ctx[0]) ?? this.idx.get(BOS) ?? 0
    const w2 = this.idx.get(ctx[1]) ?? this.idx.get(BOS) ?? 0

    const out: Omit<Prediction, 'share'>[] = []
    const seen = new Set<string>()
    const accept = (id: number, p: number, order: 3 | 2 | 1) => {
      const word = this.m.vocab[id]
      if (!word || word.startsWith('<') || seen.has(word)) return
      if (!/[a-z0-9]/i.test(word)) return // punctuation tokens are not suggestions
      if (complete && !word.startsWith(partial)) return
      if (complete && word === partial) return
      seen.add(word)
      out.push({ word, p, order })
    }

    for (const [id, p] of this.m.trigram[`${w1},${w2}`] ?? []) accept(id, p, 3)
    if (out.length < k) for (const [id, p] of this.m.bigram[String(w2)] ?? []) accept(id, p, 2)
    if (out.length < k) for (const [id, p] of this.m.unigram) accept(id, p, 1)

    const top = out.slice(0, k)
    // `p` stays the true model probability; `share` is that probability
    // renormalised across the shown candidates, which is what a bar should encode.
    const sum = top.reduce((a, x) => a + x.p, 0) || 1
    return top.map((x) => ({ ...x, share: x.p / sum }))
  }

  /** Continue the text by n words, always taking the most likely path. */
  extend(text: string, n = 8): string {
    let cur = text
    for (let i = 0; i < n; i++) {
      const [best] = this.predict(cur.endsWith(' ') ? cur : cur + ' ', 1)
      if (!best) break
      cur = (cur.endsWith(' ') ? cur : cur + ' ') + best.word
    }
    return cur
  }
}

export async function loadPredictor(base = ''): Promise<Predictor> {
  const res = await fetch(`${base}/models/lm.json`)
  if (!res.ok) throw new Error(`lm.json ${res.status}`)
  return new Predictor((await res.json()) as LmModel)
}
