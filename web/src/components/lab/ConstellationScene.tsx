'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

export type SpaceNode = { id: string; label: string; kind: 'project' | 'role'; pos: [number, number, number]; tags: string[] }
export type SpaceEdge = { a: string; b: string; w: number }

const R = 2.95

function Edges({ nodes, edges }: { nodes: SpaceNode[]; edges: SpaceEdge[] }) {
  const geo = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const pts: number[] = []
    for (const e of edges) {
      const a = byId.get(e.a)
      const b = byId.get(e.b)
      if (!a || !b) continue
      pts.push(...a.pos.map((v) => v * R), ...b.pos.map((v) => v * R))
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [nodes, edges])

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#2C3348" transparent opacity={0.85} />
    </lineSegments>
  )
}

function Node({
  node,
  active,
  onHover,
}: {
  node: SpaceNode
  active: boolean
  onHover: (id: string | null) => void
}) {
  const router = useRouter()
  const ref = useRef<THREE.Mesh>(null)
  const pos = useMemo(() => new THREE.Vector3(...node.pos).multiplyScalar(R), [node.pos])
  const colour = node.kind === 'project' ? '#CCFF33' : '#6E4BFF'

  useFrame((state) => {
    if (!ref.current) return
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6 + pos.x * 3) * 0.06
    ref.current.scale.setScalar((active ? 1.7 : 1) * pulse)
  })

  return (
    <group position={pos}>
      <mesh
        ref={ref}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(node.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(null)
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (node.kind === 'project') router.push(`/work/${node.id}`)
        }}
      >
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      <mesh scale={active ? 2.4 : 1.8}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color={colour} transparent opacity={active ? 0.22 : 0.08} />
      </mesh>
      <Html
        center
        distanceFactor={9}
        style={{ pointerEvents: 'none', transform: 'translateY(-26px)' }}
      >
        <span
          className="whitespace-nowrap rounded px-1 py-0.5 font-mono text-[9px] tracking-tight transition-all duration-200"
          style={{
            color: active ? '#07080B' : '#8B93A5',
            background: active ? colour : 'rgba(7,8,11,0.72)',
            opacity: active ? 1 : 0.85,
          }}
        >
          {node.label.split('—')[0].trim()}
        </span>
      </Html>
    </group>
  )
}

function Rig({ paused }: { paused: boolean }) {
  const { camera } = useThree()
  useFrame((_, dt) => {
    if (paused) return
    const a = dt * 0.11
    const x = camera.position.x * Math.cos(a) - camera.position.z * Math.sin(a)
    const z = camera.position.x * Math.sin(a) + camera.position.z * Math.cos(a)
    camera.position.set(x, camera.position.y, z)
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function ConstellationScene({ nodes, edges }: { nodes: SpaceNode[]; edges: SpaceEdge[] }) {
  const [hover, setHover] = useState<string | null>(null)
  const active = nodes.find((n) => n.id === hover)

  return (
    <div className="relative h-[440px] w-full md:h-[560px]">
      <Canvas camera={{ position: [0, 0.9, 10], fov: 44 }} dpr={[1, 1.8]}>
        <color attach="background" args={['#0C0E14']} />
        <fog attach="fog" args={['#0C0E14', 12, 22]} />
        <Edges nodes={nodes} edges={edges} />
        {nodes.map((n) => (
          <Node key={n.id} node={n} active={hover === n.id} onHover={setHover} />
        ))}
        <Rig paused={!!hover} />
        <OrbitControls enablePan={false} enableZoom minDistance={5} maxDistance={14} />
      </Canvas>

      {active && (
        <div className="pointer-events-none absolute bottom-4 left-4 max-w-[280px] rounded-xl border border-line bg-void/90 p-3.5 backdrop-blur">
          <p className="font-mono text-[10px] uppercase tracking-wider text-volt">{active.kind}</p>
          <p className="mt-1 text-[14px] text-bone">{active.label}</p>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">{active.tags.slice(0, 6).join(' · ')}</p>
        </div>
      )}
    </div>
  )
}
