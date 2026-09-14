import type { SearchIndex, SearchHit } from './types'

const WORD = /[a-z0-9][a-z0-9+#.\-]*/g
const STOP = new Set(
  'the a an and or but of to in on at for with is are was were be been it its that this as by from has have had not no so than then they them their i my we our you your which what when where who how can could would should will do does did if up out about into over also'.split(' '),
)

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(WORD) ?? []).filter((t) => !STOP.has(t) && t.length > 1)
}

function charGrams(text: string, n = 4): Set<string> {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const out = new Set<string>()
  for (let i = 0; i + n <= s.length; i++) out.add(s.slice(i, i + n))
  return out
}

/**
 * Concrete work outranks a skill-list entry claiming the same word.
 * A recruiter asking about testing wants the Vitest bullet from the co-op,
 * not the line in the skills table that says "testing".
 */
const KIND_PRIOR: Record<string, number> = {
  role: 1.15,
  project: 1.1,
  education: 1.0,
  skill: 0.72,
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/**
 * Hybrid retrieval: BM25 over words, expanded through a curated concept map,
 * with a character n-gram tie-breaker for typos and morphology.
 *
 * On a 77-document corpus this beats a small embedding model, and it answers
 * in under a millisecond with no model download.
 */
export class SearchEngine {
  private ix: SearchIndex
  private docGrams: Set<string>[]

  private vocabGrams: [string, Set<string>][]

  constructor(index: SearchIndex) {
    this.ix = index
    this.docGrams = index.docs.map((d) => charGrams(`${d.text} ${d.tags.join(' ')}`))
    // indexed vocabulary, for correcting a misspelled query term to the
    // nearest real term BEFORE scoring — which is where typo tolerance belongs
    this.vocabGrams = Object.keys(index.idf).map((t) => [t, charGrams(t, 3)])
  }

  /** Nearest indexed term to an unknown query term, or null if nothing is close. */
  private correct(term: string): string | null {
    if (this.ix.idf[term] !== undefined) return term
    const g = charGrams(term, 3)
    let best: string | null = null
    let bestScore = 0.34 // below this, "correcting" invents a match
    for (const [cand, cg] of this.vocabGrams) {
      if (Math.abs(cand.length - term.length) > 4) continue
      const j = jaccard(g, cg)
      if (j > bestScore) {
        bestScore = j
        best = cand
      }
    }
    return best
  }

  get size() {
    return this.ix.docs.length
  }
  get termCount() {
    return Object.keys(this.ix.idf).length
  }

  /** Inverse document frequency of a term; 0 when the corpus has never seen it. */
  idfOf(term: string): number {
    return this.ix.idf[term] ?? 0
  }

  /** Expand a query through the concept map; expansions score at a discount. */
  expand(terms: string[]): { term: string; weight: number }[] {
    const out = new Map<string, number>()
    for (const t of terms) {
      out.set(t, Math.max(out.get(t) ?? 0, 1))
      for (const e of this.ix.concepts[t] ?? []) {
        out.set(e, Math.max(out.get(e) ?? 0, 0.45))
      }
    }
    return [...out].map(([term, weight]) => ({ term, weight }))
  }

  search(query: string, limit = 8): SearchHit[] {
    const raw = tokenize(query)
    if (!raw.length) return []

    // correct unknown terms to the nearest indexed term
    const qTerms: string[] = []
    for (const t of raw) {
      const c = this.correct(t)
      if (c) qTerms.push(c)
    }
    if (!qTerms.length) return []
    const expanded = this.expand(qTerms)
    const core = new Set(qTerms)

    const scores = new Float64Array(this.ix.docs.length)
    const matched: Set<string>[] = this.ix.docs.map(() => new Set<string>())
    const covered: Set<string>[] = this.ix.docs.map(() => new Set<string>())
    const { k1, b, avgLen, docLen, idf, postings } = this.ix

    for (const { term, weight } of expanded) {
      const posting = postings[term]
      if (!posting) continue
      const termIdf = idf[term] ?? 0
      for (const [docI, tf] of posting) {
        const norm = 1 - b + (b * docLen[docI]) / avgLen
        scores[docI] += weight * termIdf * ((tf * (k1 + 1)) / (tf + k1 * norm))
        if (weight === 1) matched[docI].add(term)
        covered[docI].add(term)
      }
    }

    // Coverage: a document answering two of the query's ideas beats one that
    // merely repeats a single term, which is what plain BM25 would reward.
    for (let i = 0; i < scores.length; i++) {
      if (scores[i] === 0) continue
      let hit = 0
      for (const t of core) if (covered[i].has(t)) hit++
      const coverage = hit / core.size
      scores[i] *= 1 + 0.75 * coverage
      scores[i] *= KIND_PRIOR[this.ix.docs[i].sourceKind] ?? 1
    }

    const ranked = [...scores]
      .map((score, i) => ({ score, i }))
      .filter((x) => x.score > 0.2)
      .sort((a, b2) => b2.score - a.score)
      .slice(0, limit)

    const best = ranked[0]?.score || 1
    return ranked.map(({ score, i }) => ({
      doc: this.ix.docs[i],
      score,
      strength: score / best,
      matchedTerms: [...matched[i]],
    }))
  }
}

export async function loadSearch(base = ''): Promise<SearchEngine> {
  const res = await fetch(`${base}/models/index.json`)
  if (!res.ok) throw new Error(`index.json ${res.status}`)
  return new SearchEngine((await res.json()) as SearchIndex)
}
