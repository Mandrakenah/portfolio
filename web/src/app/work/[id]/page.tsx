import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { projects } from '@/content/projects'
import { Footer } from '@/components/chrome/Footer'
import { Reveal } from '@/components/motion/Reveal'

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const p = projects.find((x) => x.id === id)
  if (!p) return { title: 'Not found' }
  return { title: p.name, description: p.tagline }
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = projects.find((x) => x.id === id)
  if (!p) notFound()

  const idx = projects.findIndex((x) => x.id === id)
  const next = projects[(idx + 1) % projects.length]

  return (
    <main id="main">
      <article className="px-5 pt-36 md:px-10 md:pt-44">
        <div className="mx-auto max-w-[1000px]">
          <Link href="/work" className="-mx-2 inline-block rounded px-2 py-2 font-mono text-[12px] text-mute transition-colors hover:text-volt">
            ← All work
          </Link>

          <header className="mt-8 border-b border-line pb-12">
            <div className="mb-5 flex flex-wrap items-center gap-3 font-mono text-[11px]">
              <span className="text-volt">{p.year}</span>
              <span className="text-faint">/</span>
              <span className="text-mute capitalize">{p.status}</span>
            </div>
            <h1 className="text-[clamp(2.2rem,7vw,5rem)] font-medium leading-[0.95] tracking-[-0.04em]">{p.name}</h1>
            <p className="mt-4 max-w-2xl text-[clamp(1rem,2.2vw,1.35rem)] leading-snug text-mute">{p.tagline}</p>

            <div className="mt-8 flex flex-wrap gap-1.5">
              {p.stack.map((s) => (
                <span key={s} className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-mute">
                  {s}
                </span>
              ))}
            </div>
          </header>

          {p.metrics && p.metrics.length > 0 && (
            <div className="grid gap-6 border-b border-line py-10 sm:grid-cols-2 md:grid-cols-3">
              {p.metrics.map((m) => (
                <Reveal key={m.label}>
                  <div>
                    <div className="font-mono text-[clamp(1.6rem,3.5vw,2.4rem)] leading-none text-volt">{m.value}</div>
                    <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-faint">{m.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <div className="grid gap-12 py-14 md:grid-cols-[1fr_1.6fr] md:gap-20">
            <div className="md:sticky md:top-32 md:self-start">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">What it is</h2>
            </div>
            <div className="space-y-6">
              <p className="text-[16px] leading-relaxed text-bone md:text-[17px]">{p.blurb}</p>
              <p className="text-[15px] leading-[1.75] text-mute md:text-[16px]">{p.narrative}</p>
            </div>
          </div>

          <div className="grid gap-12 border-t border-line py-14 md:grid-cols-[1fr_1.6fr] md:gap-20">
            <div className="md:sticky md:top-32 md:self-start">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-volt">The engineering</h2>
            </div>
            <ul className="space-y-5">
              {p.highlights.map((h, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <li className="flex gap-4 text-[15px] leading-relaxed text-mute">
                    <span className="mt-2.5 h-px w-5 shrink-0 bg-volt/60" />
                    <span>{h}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>

          <Link
            href={`/work/${next.id}`}
            className="group flex items-center justify-between gap-6 border-t border-line py-12 transition-colors"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-faint">Next project</p>
              <p className="mt-2 text-[clamp(1.4rem,4vw,2.6rem)] font-medium tracking-[-0.03em] transition-colors group-hover:text-volt">
                {next.name}
              </p>
            </div>
            <span className="font-mono text-2xl text-volt transition-transform group-hover:translate-x-2">→</span>
          </Link>
        </div>
      </article>
      <Footer />
    </main>
  )
}
