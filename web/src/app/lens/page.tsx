import type { Metadata } from 'next'
import { RecruiterLens } from '@/components/lens/RecruiterLens'
import { Footer } from '@/components/chrome/Footer'

export const metadata: Metadata = {
  title: 'Recruiter Lens',
  description:
    'Paste a job posting and see, line by line, where my work matches it and where it does not. Runs entirely in your browser.',
}

export default function LensPage() {
  return (
    <main id="main">
      <section className="px-5 pb-20 pt-36 md:px-10 md:pb-28 md:pt-44">
        <div className="mx-auto max-w-[1100px]">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-volt">Recruiter Lens</p>
          <h1 className="max-w-3xl text-[clamp(2.1rem,6vw,4.4rem)] font-medium leading-[0.98] tracking-[-0.035em]">
            Paste your job posting.
            <br />
            <span className="text-mute">I will show you the gaps too.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-mute">
            This reads the posting, pulls out the requirement lines, and scores each one against the
            evidence in my work. It reports what it cannot support as readily as what it can — a matcher
            that rates everyone a 98% fit is a horoscope, not a tool.
          </p>
          <div className="mt-14">
            <RecruiterLens />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
