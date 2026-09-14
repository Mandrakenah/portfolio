'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { readIntent, clearIntent, type Intent } from '@/lib/adaptive'

export function AdaptiveBanner() {
  const [intent, setIntent] = useState<Intent | null>(null)

  useEffect(() => {
    const sync = () => setIntent(readIntent())
    sync()
    window.addEventListener('intent:change', sync)
    return () => window.removeEventListener('intent:change', sync)
  }, [])

  return (
    <AnimatePresence>
      {intent && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-volt/30 bg-volt/[0.06] px-4 py-3"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-volt">Adaptive</span>
          <p className="flex-1 text-[13px] text-mute">
            Reordered for <span className="text-bone">{intent.label}</span>
            {intent.matched.length > 0 && (
              <span className="text-faint"> · weighted toward {intent.matched.slice(0, 4).join(', ')}</span>
            )}
          </p>
          <button
            onClick={clearIntent}
            className="font-mono text-[11px] text-faint underline-offset-4 transition-colors hover:text-bone hover:underline"
          >
            reset order
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
