'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import Link from 'next/link'
import { profile } from '@/content/profile'

const LINE_1 = 'FULL-STACK'
const LINE_2 = 'ENGINEER'

function KineticLine({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block"
        initial={{ y: '105%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    </span>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 140])
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  return (
    <section ref={ref} className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-5 pb-28 pt-32 md:pb-20 md:px-10">
      {/* ambient field */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-[10%] top-[8%] h-[45vmax] w-[45vmax] rounded-full bg-plasma/12 blur-[120px]" />
        <div className="absolute -right-[5%] bottom-[5%] h-[38vmax] w-[38vmax] rounded-full bg-volt/8 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, var(--color-line) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(ellipse 75% 55% at 50% 45%, black 20%, transparent 78%)',
          }}
        />
      </div>

      <motion.div style={{ y, opacity }} className="mx-auto w-full max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] tracking-[0.14em] text-mute uppercase md:mb-7 md:text-[12px] md:tracking-[0.18em]"
        >
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
            </span>
            {profile.status}
          </span>
          <span className="text-faint">/</span>
          <span>{profile.location}</span>
        </motion.div>

        <h1 className="font-sans text-[clamp(2.9rem,11.5vw,10.5rem)] font-medium leading-[0.86] tracking-[-0.045em]">
          <KineticLine text={LINE_1} delay={0.1} />
          <span className="block overflow-hidden">
            <motion.span
              className="flex flex-col items-start gap-y-1 md:flex-row md:flex-wrap md:items-baseline md:gap-x-[0.22em]"
              initial={{ y: '105%' }}
              animate={{ y: 0 }}
              transition={{ duration: 1.1, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-volt">{LINE_2}</span>
              <span className="font-mono text-[0.115em] font-normal tracking-[0.14em] text-mute md:text-[0.16em] md:tracking-[0.1em]">
                {profile.subrole.toUpperCase()}
              </span>
            </motion.span>
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 grid gap-7 border-t border-line pt-7 md:mt-14 md:grid-cols-[1.15fr_1fr] md:gap-16 md:pt-8"
        >
          <p className="max-w-xl text-[14px] leading-[1.65] text-mute md:text-[17px]">
            {profile.intro}
          </p>

          <div className="flex flex-col items-start gap-5">
            <p className="font-mono text-[12px] leading-relaxed text-faint">
              Everything intelligent on this site — search, prediction, matching —
              runs <span className="text-volt">on your device</span>. No API keys. No model calls.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/lab"
                className="group relative overflow-hidden rounded-full bg-volt px-6 py-3 font-mono text-[13px] font-medium text-void"
              >
                <span className="relative z-10">Open the lab →</span>
                <span className="absolute inset-0 -translate-x-full bg-bone transition-transform duration-400 group-hover:translate-x-0" />
              </Link>
              <Link
                href="/lens"
                className="rounded-full border border-line px-6 py-3 font-mono text-[13px] text-bone transition-colors hover:border-volt hover:text-volt"
              >
                Paste a job description
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] tracking-[0.3em] text-faint uppercase md:block"
      >
        <motion.span
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="block"
        >
          scroll
        </motion.span>
      </motion.div>
    </section>
  )
}
