import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Nav } from '@/components/chrome/Nav'
import { Grain } from '@/components/chrome/Grain'
import { Cursor } from '@/components/chrome/Cursor'
import { SmoothScroll } from '@/components/chrome/SmoothScroll'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://arjun-saji.vercel.app'),
  title: {
    default: 'Arjun Saji — Full-Stack Engineer',
    template: '%s — Arjun Saji',
  },
  description:
    'Full-stack developer and AI student. Production React and TypeScript, with machine learning models that run in your browser — no API keys, no model calls.',
  openGraph: {
    title: 'Arjun Saji — Full-Stack Engineer',
    description: 'A portfolio that runs its own NLP models in your browser.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#07080B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <SmoothScroll />
        <Grain />
        <Cursor />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-lg focus:bg-volt focus:px-4 focus:py-2.5 focus:font-mono focus:text-[13px] focus:text-void"
        >
          Skip to content
        </a>
        <Nav />
        {children}
      </body>
    </html>
  )
}
