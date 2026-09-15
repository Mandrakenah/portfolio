'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Predictor } from './predictor'
import { SearchEngine } from './search'
import { TinyGPT, loadTinyGPT } from './tinygpt'
import type { LmModel, SearchIndex } from './types'

type Load<T> = { data: T | null; loading: boolean; error: string | null; ms: number; bytes: number }

function useArtifact<T, R>(path: string | null, build: (raw: T) => R): Load<R> {
  const [state, setState] = useState<Load<R>>({ data: null, loading: !!path, error: null, ms: 0, bytes: 0 })

  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: null, ms: 0, bytes: 0 }); return }
    let alive = true
    const t0 = performance.now()
    setState((s) => ({ ...s, loading: true, error: null }))
    fetch(path)
      .then(async (r) => {
        if (!r.ok) throw new Error(`${path} → ${r.status}`)
        const text = await r.text()
        return { raw: JSON.parse(text) as T, bytes: new Blob([text]).size }
      })
      .then(({ raw, bytes }) => {
        if (!alive) return
        setState({ data: build(raw), loading: false, error: null, ms: performance.now() - t0, bytes })
      })
      .catch((e: unknown) => {
        if (!alive) return
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'failed', ms: 0, bytes: 0 })
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return state
}

export type ModelId = 'neural' | 'general' | 'personal'

/** Both model families expose the same two calls, so the UI does not care which is loaded. */
export type Suggester = {
  suggest(text: string, maxWords?: number): string
  label: string
  detail: string
}

const MODEL_PATH: Record<'general' | 'personal', string> = {
  general: '/models/lm-general.json',
  personal: '/models/lm.json',
}

/**
 * Loads a language model on demand. `enabled` stays false until the visitor
 * actually interacts, so nobody downloads megabytes for a section they scrolled past.
 */
export function useLanguageModel(id: ModelId, enabled: boolean) {
  const ngram = useArtifact<LmModel, Predictor>(
    enabled && id !== 'neural' ? MODEL_PATH[id as 'general' | 'personal'] : null,
    (m) => new Predictor(m),
  )
  const neural = useTinyGPT(enabled && id === 'neural')
  return id === 'neural' ? neural : ngram
}

/** The transformer: a manifest plus a 4 MB int8 weight blob, both fetched once. */
export function useTinyGPT(enabled: boolean) {
  const [state, setState] = useState<Load<TinyGPT>>({ data: null, loading: false, error: null, ms: 0, bytes: 0 })
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const t0 = performance.now()
    setState((s) => ({ ...s, loading: true, error: null }))
    loadTinyGPT()
      .then((m) => {
        if (!alive) return
        setState({ data: m, loading: false, error: null, ms: performance.now() - t0, bytes: 4_290_000 })
      })
      .catch((e: unknown) => {
        if (!alive) return
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : 'failed', ms: 0, bytes: 0 })
      })
    return () => { alive = false }
  }, [enabled])
  return state
}

export const usePredictor = () => useArtifact<LmModel, Predictor>('/models/lm.json', (m) => new Predictor(m))
export const useSearch = () => useArtifact<SearchIndex, SearchEngine>('/models/index.json', (i) => new SearchEngine(i))

/** Debounce a rapidly-changing value so prediction does not run on every keystroke. */
export function useDebounced<T>(value: T, delay = 60): T {
  const [v, setV] = useState(value)
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => setV(value), delay)
    return () => { if (t.current) clearTimeout(t.current) }
  }, [value, delay])
  return v
}

export function useStableCallback<A extends unknown[], R>(fn: (...a: A) => R) {
  const ref = useRef(fn)
  useEffect(() => { ref.current = fn })
  return useCallback((...a: A) => ref.current(...a), [])
}
