'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Index' },
  { href: '/work', label: 'Work' },
  { href: '/lab', label: 'Lab' },
  { href: '/lens', label: 'Recruiter Lens' },
  { href: '/system', label: 'System' },
]

export function Nav() {
  const path = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [path])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled ? 'backdrop-blur-xl bg-void/70 border-b border-line' : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 md:px-10">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Arjun Saji, home">
          <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-volt font-mono text-[13px] font-bold text-void">
            A
          </span>
          <span className="font-mono text-[13px] tracking-tight text-bone">
            arjun<span className="text-mute">.saji</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = l.href === '/' ? path === '/' : path.startsWith(l.href)
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    'relative rounded-full px-3.5 py-1.5 font-mono text-[12px] tracking-wide transition-colors',
                    active ? 'text-void' : 'text-mute hover:text-bone',
                  )}
                >
                  {active && <span className="absolute inset-0 rounded-full bg-volt" />}
                  <span className="relative">{l.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <a
          href="mailto:arjun000saji@gmail.com"
          className="hidden rounded-full border border-line px-4 py-1.5 font-mono text-[12px] text-bone transition-colors hover:border-volt hover:text-volt md:block"
        >
          Get in touch
        </a>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className="relative block h-3 w-4">
            <span className={cn('absolute left-0 h-px w-4 bg-bone transition-all', open ? 'top-1.5 rotate-45' : 'top-0')} />
            <span className={cn('absolute left-0 top-1.5 h-px w-4 bg-bone transition-opacity', open && 'opacity-0')} />
            <span className={cn('absolute left-0 h-px w-4 bg-bone transition-all', open ? 'top-1.5 -rotate-45' : 'top-3')} />
          </span>
        </button>
      </nav>

      {open && (
        <ul className="border-t border-line bg-void/95 px-5 py-3 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block py-2.5 font-mono text-sm text-bone">
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <a href="mailto:arjun000saji@gmail.com" className="block py-2.5 font-mono text-sm text-volt">
              Get in touch →
            </a>
          </li>
        </ul>
      )}
    </header>
  )
}
