'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { SpaceEdge, SpaceNode } from './ConstellationScene'

const Scene = dynamic(() => import('./ConstellationScene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-[440px] place-items-center md:h-[560px]">
      <p className="font-mono text-[12px] text-faint">loading semantic space…</p>
    </div>
  ),
})

export function Constellation() {
  const [data, setData] = useState<{ nodes: SpaceNode[]; edges: SpaceEdge[] } | null>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      if (!c.getContext('webgl2') && !c.getContext('webgl')) setSupported(false)
    } catch {
      setSupported(false)
    }
    fetch('/models/space.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ nodes: [], edges: [] }))
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink/60 backdrop-blur">
      <div className="border-b border-line p-5 md:p-7">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">
          A map of my work, drawn by similarity
        </h3>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mute">
          Each dot is a project or a job. <span className="text-bone">Things that are alike sit close
          together</span> — nothing here was placed by hand. The two machine-learning projects drift
          toward each other; the apps I built cluster somewhere else entirely; the lines connect the
          pairs that came out most similar.
        </p>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-faint">
          How: every project is turned into a list of numbers describing which words it uses, those
          lists get squashed down to three dimensions so they can be drawn, and then the dots are
          nudged apart just enough to read the labels. Drag to spin it, click a dot to open the project.
        </p>
        {data && (
          <p className="mt-3 font-mono text-[11px] text-faint">
            {data.nodes.length} nodes · {data.edges.length} similarity edges ·{' '}
            <span className="text-volt">■</span> project <span className="ml-2 text-plasma">■</span> role
          </p>
        )}
      </div>

      {!supported ? (
        <div className="grid h-[300px] place-items-center px-6 text-center">
          <p className="font-mono text-[12px] text-faint">
            This view needs WebGL, which your browser has turned off.
            <br />
            Everything else on this page works without it.
          </p>
        </div>
      ) : data && data.nodes.length > 0 ? (
        <Scene nodes={data.nodes} edges={data.edges} />
      ) : (
        <div className="grid h-[440px] place-items-center md:h-[560px]">
          <p className="font-mono text-[12px] text-faint">loading semantic space…</p>
        </div>
      )}
    </div>
  )
}
