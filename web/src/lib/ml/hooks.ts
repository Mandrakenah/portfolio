'use client'

import { useEffect, useState } from 'react'
import { Predictor } from './predictor'
import { SearchEngine } from './search'
import type { LmModel, SearchIndex } from './types'

type Load<T> = { data: T | null; loading: boolean; error: string | null; ms: number }

function useArtifact<T, R>(path: string, build: (raw: T) => R): Load<R> {
  const [state, setState] = useState<Load<R>>({ data: null, loading: true, error: null, ms: 0 })

  useEffect(() => {
    let alive = true
    const t0 = performance.now()
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`${path} → ${r.status}`)
        return r.json()
      })
      .then((raw: T) => {
        if (!alive) return
        setState({ data: build(raw), loading: false, error: null, ms: performance.now() - t0 })
      })
      .catch((e: unknown) => {
        if (!alive) return
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'failed', ms: 0 })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return state
}

export const usePredictor = () => useArtifact<LmModel, Predictor>('/models/lm.json', (m) => new Predictor(m))
export const useSearch = () => useArtifact<SearchIndex, SearchEngine>('/models/index.json', (i) => new SearchEngine(i))
