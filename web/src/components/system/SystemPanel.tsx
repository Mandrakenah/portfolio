'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Predictor } from '@/lib/ml/predictor'
import { SearchEngine } from '@/lib/ml/search'
import { formatBytes } from '@/lib/utils'

type Meta = {
  builtAt: string
  buildSeconds: number
  artifacts: { name: string; bytes: number; human: string }[]
  totalBytes: number
  totalHuman: string
  lm: { vocabSize: number; bigramContexts: number; trigramContexts: number; tokensSeen: number; perplexityHeldOut: number; perplexityTrain: number }
  retrieval: { documents: number; terms: number; conceptExpansions: number }
  space: { nodes: number; edges: number; explainedVariance: number }
  corpusWords: number
}

type Health = { runtime: string; region: string; commit: string; uptimeSeconds: number }

type Bench = { label: string; value: string; note: string }

export function SystemPanel() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [apiMs, setApiMs] = useState<number | null>(null)
  const [bench, setBench] = useState<Bench[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/models/meta.json').then((r) => r.json()).then(setMeta).catch(() => setErr('manifest unavailable'))

    const t0 = performance.now()
    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => {
        setApiMs(performance.now() - t0)
        setHealth(h)
      })
      .catch(() => setApiMs(-1))

    // Measure the models on THIS device rather than quoting a number from a README.
    ;(async () => {
      try {
        const lmT0 = performance.now()
        const lm = new Predictor(await (await fetch('/models/lm.json')).json())
        const lmLoad = performance.now() - lmT0

        const ixT0 = performance.now()
        const se = new SearchEngine(await (await fetch('/models/index.json')).json())
        const ixLoad = performance.now() - ixT0

        const p0 = performance.now()
        for (let i = 0; i < 200; i++) lm.predict('I built a', 5)
        const predMs = (performance.now() - p0) / 200

        const s0 = performance.now()
        for (let i = 0; i < 100; i++) se.search('production typescript testing', 8)
        const searchMs = (performance.now() - s0) / 100

        setBench([
          { label: 'language model load', value: `${lmLoad.toFixed(0)} ms`, note: 'parse + index construction' },
          { label: 'retrieval index load', value: `${ixLoad.toFixed(0)} ms`, note: 'parse + char-gram build' },
          { label: 'next-word prediction', value: `${predMs.toFixed(3)} ms`, note: 'mean over 200 runs' },
          { label: 'semantic search query', value: `${searchMs.toFixed(3)} ms`, note: 'mean over 100 runs' },
        ])
      } catch {
        setErr('benchmark failed')
      }
    })()
  }, [])

  const Row = ({ k, v }: { k: string; v: string }) => (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-2.5">
      <span className="font-mono text-[11px] text-faint">{k}</span>
      <span className="text-right font-mono text-[12px] text-bone">{v}</span>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* live runtime */}
        <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
          <h3 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
            </span>
            Live runtime
          </h3>
          {health ? (
            <>
              <Row k="api round trip" v={apiMs && apiMs > 0 ? `${apiMs.toFixed(0)} ms` : '—'} />
              <Row k="runtime" v={health.runtime} />
              <Row k="region" v={health.region} />
              <Row k="commit" v={health.commit} />
              <Row k="uptime" v={`${health.uptimeSeconds}s`} />
            </>
          ) : (
            <p className="font-mono text-[12px] text-faint">pinging /api/health…</p>
          )}
        </div>

        {/* measured on this device */}
        <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
            Measured on your device
          </h3>
          {bench.length ? (
            bench.map((b) => (
              <div key={b.label} className="border-b border-line py-2.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[11px] text-faint">{b.label}</span>
                  <span className="font-mono text-[12px] text-volt">{b.value}</span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-faint/70">{b.note}</p>
              </div>
            ))
          ) : (
            <p className="font-mono text-[12px] text-faint">running benchmark…</p>
          )}
        </div>
      </div>

      {/* artifacts */}
      <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
        <h3 className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Shipped artifacts</h3>
        <p className="mb-5 text-[13px] text-mute">
          Everything the intelligence on this site needs, in {meta?.totalHuman ?? '—'}. For comparison, one
          transformer sentence-embedding model is about 23 MB.
        </p>
        {meta ? (
          <>
            <div className="space-y-3">
              {meta.artifacts.map((a) => (
                <div key={a.name}>
                  <div className="mb-1 flex items-baseline justify-between gap-4">
                    <span className="font-mono text-[12px] text-bone">{a.name}</span>
                    <span className="font-mono text-[11px] text-mute">{a.human}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-elevated">
                    <motion.div
                      className="h-full rounded-full bg-volt"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(a.bytes / meta.totalBytes) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <Row k="total" v={`${formatBytes(meta.totalBytes)}`} />
              <Row k="built at" v={meta.builtAt.replace('T', ' ').replace('Z', ' UTC')} />
              <Row k="pipeline duration" v={`${meta.buildSeconds}s`} />
            </div>
          </>
        ) : (
          <p className="font-mono text-[12px] text-faint">{err ?? 'loading manifest…'}</p>
        )}
      </div>

      {/* model cards */}
      {meta && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
            <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Language model</h3>
            <Row k="type" v="Kneser-Ney trigram" />
            <Row k="vocabulary" v={meta.lm.vocabSize.toLocaleString()} />
            <Row k="trigram contexts" v={meta.lm.trigramContexts.toLocaleString()} />
            <Row k="training tokens" v={meta.lm.tokensSeen.toLocaleString()} />
            <Row k="perplexity (train)" v={String(meta.lm.perplexityTrain)} />
            <Row k="perplexity (held out)" v={String(meta.lm.perplexityHeldOut)} />
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-faint">
              The gap between those two numbers is the honest cost of training a model on
              {' '}{meta.corpusWords.toLocaleString()} words. I am reporting it rather than the flattering one.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
            <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Retrieval</h3>
            <Row k="scorer" v="BM25 + concepts" />
            <Row k="documents" v={String(meta.retrieval.documents)} />
            <Row k="indexed terms" v={String(meta.retrieval.terms)} />
            <Row k="concept expansions" v={String(meta.retrieval.conceptExpansions)} />
            <Row k="typo correction" v="char 3-gram" />
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-faint">
              Chosen over embeddings deliberately: on 65 documents a curated concept map beats a small
              model, and costs the visitor nothing to download.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-ink/60 p-6 backdrop-blur">
            <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Semantic space</h3>
            <Row k="method" v="TF-IDF → SVD" />
            <Row k="nodes" v={String(meta.space.nodes)} />
            <Row k="edges" v={String(meta.space.edges)} />
            <Row k="explained variance" v={`${(meta.space.explainedVariance * 100).toFixed(1)}%`} />
            <Row k="rendering" v="WebGL / three.js" />
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-faint">
              Three dimensions capture only part of the structure. That is a limitation of the projection,
              not a claim about the work.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
