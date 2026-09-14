import type { Role } from './types'

export const roles: Role[] = [
  {
    id: 'aifinancial',
    company: 'AiFinancial',
    title: 'Frontend Developer, Co-op',
    location: 'Toronto, ON',
    start: 'May 2026',
    end: 'Aug 2026',
    kind: 'coop',
    summary:
      'Frontend co-op on a production React and TypeScript monorepo. I arrived to write features and left having written the standard the team builds components against.',
    bullets: [
      'Authored the React Component Construction Standard: fourteen rules across three parts, shipped as a written specification, an audit spreadsheet scoring existing components against each rule, and an HTML guide the team could read without opening Word.',
      'Ran a spike on Orval for OpenAPI client generation, documented the trade-offs in an architecture decision record, and built a working prototype branch wiring generated clients into TanStack Query with MSW-backed tests.',
      'Diagnosed and fixed an MSAL authentication bug where token acquisition failed silently and left the user on a blank screen instead of a re-authentication prompt.',
      'Wrote component tests with Vitest and Mock Service Worker, covering the network layer rather than stubbing it, so the tests broke when the contract broke.',
      'Corrected internal documentation that had drifted from the codebase, which is unglamorous and is exactly why nobody had done it.',
    ],
    stack: ['React', 'TypeScript', 'pnpm monorepo', 'TanStack Query', 'MSW', 'Vitest', 'MSAL', 'Orval', 'OpenAPI'],
  },
  {
    id: 'stemflower',
    company: 'Up4 The Challenge — STEMflower',
    title: 'Web Developer, Work-Integrated Learning Placement',
    location: 'Remote',
    start: '2026',
    end: '2026',
    kind: 'placement',
    summary:
      'Enhancement work on the STEMflower platform, an education product aimed at getting young people into STEM.',
    bullets: [
      'Delivered site enhancements against milestone deadlines tracked through Riipen, including scoped status reporting to the project supervisor.',
      'Implemented French translation across the platform so the product could serve bilingual Canadian classrooms.',
      'Scoped an AI hint system for the learning exercises, working through what a hint should reveal and what it should withhold, which turned out to be a pedagogy question wearing an engineering costume.',
    ],
    stack: ['JavaScript', 'HTML', 'CSS', 'i18n', 'Content Systems'],
  },
  {
    id: 'earls',
    company: 'Earls Kitchen + Bar',
    title: 'Line Cook → Restaurant Data & Tech Assistant',
    location: 'Toronto, ON',
    start: '2023',
    end: 'Present',
    kind: 'part-time',
    summary:
      'Four years of high-volume service work that funded the degree and taught me more about operating under load than any course did.',
    bullets: [
      'Ran multiple stations through peak service, including a night when several cooks called in sick and two of us covered appetizers, salads and sushi without pushing ticket times.',
      'Batched similar orders to cut redundant prep, and kept the expo station ahead of the queue rather than reacting to it.',
      'Moved into data and tech support work: schedule and inventory tooling, and the reporting the kitchen actually used.',
      'Received manager recognition for leadership and adaptability during understaffed service.',
    ],
    stack: ['Operations', 'Data Reporting', 'Process Improvement'],
  },
]
