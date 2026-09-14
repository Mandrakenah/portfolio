export type LmStats = {
  vocabSize: number
  bigramContexts: number
  trigramContexts: number
  tokensSeen: number
  perplexityHeldOut: number
  perplexityTrain: number
}

export type LmModel = {
  vocab: string[]
  unigram: [number, number][]
  bigram: Record<string, [number, number][]>
  trigram: Record<string, [number, number][]>
  discount: number
  stats: LmStats
}

export type Prediction = {
  word: string
  p: number
  /** which model order produced it — the interesting part */
  order: 3 | 2 | 1
  /** p renormalised across the displayed candidates, for bar widths */
  share: number
}

export type IndexDoc = {
  id: string
  text: string
  sourceId: string
  sourceLabel: string
  sourceKind: 'role' | 'project' | 'education' | 'skill'
  tags: string[]
}

export type SearchIndex = {
  k1: number
  b: number
  docIds: string[]
  docLen: number[]
  avgLen: number
  idf: Record<string, number>
  postings: Record<string, [number, number][]>
  concepts: Record<string, string[]>
  docs: IndexDoc[]
}

export type SearchHit = {
  doc: IndexDoc
  score: number
  /** 0–1, relative to the best hit in this result set */
  strength: number
  matchedTerms: string[]
}
