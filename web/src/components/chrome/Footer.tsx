import Link from 'next/link'
import { profile } from '@/content/profile'

export function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden border-t border-line px-5 pb-10 pt-28 md:px-10 md:pt-40">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-6 font-mono text-[11px] tracking-[0.25em] text-volt uppercase">06 — Contact</p>

        <a
          href={`mailto:${profile.email}`}
          className="group block text-[clamp(2rem,8vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.04em] transition-colors hover:text-volt"
        >
          Let&apos;s build
          <br />
          something.
        </a>

        <div className="mt-16 grid gap-10 border-t border-line pt-10 md:grid-cols-[1fr_auto] md:gap-20">
          <div className="space-y-6">
            <div className="space-y-1.5 font-mono text-[13px]">
              <a href={`mailto:${profile.email}`} className="block text-bone transition-colors hover:text-volt">
                {profile.email}
              </a>
              <a href={`tel:${profile.phone.replace(/[^0-9+]/g, '')}`} className="block text-mute transition-colors hover:text-volt">
                {profile.phone}
              </a>
              <p className="text-faint">{profile.location}</p>
            </div>

            <ul className="flex flex-wrap gap-2.5">
              <li>
                <a
                  href="/Arjun-Saji-Resume.pdf"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-2 rounded-full bg-volt px-4 py-2 font-mono text-[12px] font-medium text-void transition-opacity hover:opacity-90"
                >
                  Resume
                  <span aria-hidden className="transition-transform group-hover:translate-y-0.5">↓</span>
                </a>
              </li>
              {profile.socials
                .filter((s) => s.label !== 'Email')
                .map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-[12px] text-bone transition-colors hover:border-volt hover:text-volt"
                    >
                      {s.label}
                      <span className="text-faint transition-all group-hover:translate-x-0.5 group-hover:text-volt">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-2 font-mono text-[12px] md:justify-end">
            {[
              ['/work', 'Work'],
              ['/lab', 'Lab'],
              ['/lens', 'Recruiter Lens'],
              ['/system', 'System'],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="text-mute transition-colors hover:text-volt">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-line pt-6 font-mono text-[10px] text-faint md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {profile.name}. Built with Next.js, and models trained from scratch.</p>
          <p>Every prediction on this site ran on your device.</p>
        </div>
      </div>
    </footer>
  )
}
