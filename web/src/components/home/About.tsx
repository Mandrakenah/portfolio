'use client'

import Image from 'next/image'
import { Reveal, RevealWords } from '@/components/motion/Reveal'
import { profile } from '@/content/profile'

export function About() {
  return (
    <section id="about" className="relative px-5 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1400px]">
        <Reveal>
          <p className="mb-14 font-mono text-[11px] tracking-[0.25em] text-volt uppercase">01 — Background</p>
        </Reveal>

        <div className="grid gap-14 md:grid-cols-[1fr_1.4fr] md:gap-24">
          <div className="md:sticky md:top-32 md:self-start">
            <h2 className="text-[clamp(1.9rem,4.5vw,3.4rem)] font-medium leading-[1.03] tracking-[-0.03em]">
              <RevealWords text="A kitchen taught me to work under load." />
            </h2>
            <Reveal delay={0.1}>
              <div className="mt-9 flex items-center gap-5">
                <Image
                  src="/portrait.webp"
                  alt={`${profile.name}, ${profile.role}`}
                  width={400}
                  height={400}
                  sizes="112px"
                  priority={false}
                  className="h-[92px] w-[92px] shrink-0 rounded-xl object-cover ring-1 ring-line md:h-28 md:w-28"
                />
                <div className="font-mono text-[11px] leading-relaxed text-faint">
                  <p className="text-bone">{profile.name}</p>
                  <p>{profile.role}</p>
                  <a
                    href="/Arjun-Saji-Resume.pdf"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-flex items-center gap-1.5 text-volt transition-opacity hover:opacity-70"
                  >
                    Download resume <span aria-hidden>↓</span>
                  </a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <dl className="mt-9 space-y-4 border-t border-line pt-8 font-mono text-[12px]">
                {[
                  ['Program', profile.education.credential.split('—')[0].trim()],
                  ['Stream', 'Artificial Intelligence'],
                  ['School', `${profile.education.school}, ${profile.education.campus.split(',')[0]}`],
                  ['Graduating', profile.graduating],
                  ['GPA', profile.education.gpa],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6">
                    <dt className="text-faint">{k}</dt>
                    <dd className="text-right text-bone">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="space-y-7">
            {profile.about.map((para, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <p className="text-[15px] leading-[1.75] text-mute md:text-[17px]">{para}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
