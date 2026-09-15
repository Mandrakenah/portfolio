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
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">Semantic space</h3>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mute">
          Every project and role, embedded as a TF-IDF vector and projected into three dimensions.
          Distance here is semantic distance — the machine learning work clusters away from the product
          work because the language of the two is genuinely different. Drag to orbit, click a project to open it.
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
