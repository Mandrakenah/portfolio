'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A cursor that reacts to what is under it. Pointer-fine devices only:
 * on touch there is no cursor to replace and drawing one is pure cost.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setOn(true)

    const pos = { x: innerWidth / 2, y: innerHeight / 2 }
    const ringPos = { ...pos }
    let hovering = false
    let raf = 0

    const move = (e: PointerEvent) => {
      pos.x = e.clientX
      pos.y = e.clientY
      const el = e.target as HTMLElement
      hovering = !!el?.closest?.('a,button,[data-cursor="grow"]')
    }

    const tick = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.16
      ringPos.y += (pos.y - ringPos.y) * 0.16
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x - 3}px,${pos.y - 3}px,0)`
      if (ring.current) {
        const s = hovering ? 2.1 : 1
        ring.current.style.transform = `translate3d(${ringPos.x - 16}px,${ringPos.y - 16}px,0) scale(${s})`
        ring.current.style.opacity = hovering ? '1' : '0.45'
      }
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', move, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!on) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <div ref={dot} className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-volt" />
      <div
        ref={ring}
        className="absolute left-0 top-0 h-8 w-8 rounded-full border border-volt/60 transition-opacity duration-200"
      />
    </div>
  )
}
