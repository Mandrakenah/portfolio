import type { Metadata } from 'next'
import { Work } from '@/components/home/Work'
import { Footer } from '@/components/chrome/Footer'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Projects and products I have built — full-stack applications, developer tools and machine learning systems.',
}

export default function WorkPage() {
  return (
    <main>
      <section className="px-5 pb-4 pt-36 md:px-10 md:pt-44">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-volt">Work</p>
          <h1 className="max-w-2xl text-[clamp(2.1rem,6vw,4.4rem)] font-medium leading-[0.98] tracking-[-0.035em]">
            Everything I have built,
            <span className="text-mute"> and why.</span>
          </h1>
        </div>
      </section>
      <Work />
      <Footer />
    </main>
  )
}
