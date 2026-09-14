import type { Role } from './types'

export const roles: Role[] = [
  {
    id: 'aifinancial',
    company: 'AiFinancial',
    title: 'Frontend Developer, Co-op Intern',
    location: 'Toronto, ON',
    start: 'May 2026',
    end: 'Aug 2026',
    kind: 'coop',
    summary:
      'Frontend co-op on a production React and TypeScript monorepo. I spent the term on the seam between the frontend and the backend contract, and left the codebase generating its API clients instead of hand-writing them.',
    bullets: [
      'Evaluated four approaches to API integration — Orval, Pact, Hey API and openapi-typescript — documented the trade-offs as ADR-0005, and presented the recommendation to other development teams.',
      'Found inconsistencies between how the frontend called the API and what the backend REST contracts actually promised, then helped introduce Orval to generate TypeScript clients directly from the OpenAPI specification, so the mismatch could not silently return.',
      'Migrated production React components from hand-written fetch patterns to generated TanStack Query hooks, cutting roughly 60% of the code in each component.',
      'Built the Phase 1 prototype infrastructure — Orval code generation, an MSW mock server and the TanStack Query wiring — inside a pnpm monorepo authenticated with MSAL.',
      'Wrote Vitest component tests against MSW handlers, and tracked down a token synchronisation defect between two ApiClient instances in the authentication flow.',
      'Worked in a cross-functional Agile team with React/TypeScript frontend and Java/Spring Boot backend developers, through feature branches, rebases, pull requests, Docker and CI/CD.',
    ],
    stack: ['React', 'TypeScript', 'TanStack Query', 'Orval', 'OpenAPI', 'MSW', 'Vitest', 'MSAL', 'pnpm monorepo', 'Docker', 'CI/CD'],
  },
  {
    id: 'stemflower',
    company: 'Up4 The Challenge — STEMflower',
    title: 'Software Development Intern',
    location: 'Toronto, ON',
    start: 'June 2026',
    end: 'Aug 2026',
    kind: 'placement',
    summary:
      'A K–12 STEM education web app used in live classroom workshops. Most of what I shipped came from watching teachers struggle with it in front of me.',
    bullets: [
      'Designed and built the bilingual English and French interface across a sixteen-page student activity flow in HTML, CSS and JavaScript.',
      'Ran usability testing with teachers during live workshops and shipped the changes it surfaced: direct dashboard navigation, one-click preview, and reordered student responses.',
      'Rebuilt copy that had been baked into fourteen background images as live, responsive DOM text through a Node.js and pngjs pipeline — restoring screen-reader access, text zoom and find-in-page.',
      'Closed three privilege-escalation gaps in the Firebase Firestore security rules and two DOM-based XSS vectors, backed by Playwright and jsdom suites running 264 automated checks.',
    ],
    stack: ['JavaScript', 'HTML', 'CSS', 'Firebase', 'Firestore', 'Playwright', 'jsdom', 'Node.js', 'i18n', 'WCAG'],
  },
  {
    id: 'earls',
    company: 'Earls Restaurants Ltd',
    title: 'Restaurant Data & Tech Assistant',
    location: 'Toronto, ON',
    start: 'Jan 2024',
    end: 'Present',
    kind: 'part-time',
    summary:
      'The job that funded the degree, and the one that taught me to explain a technical fix to somebody who is mid-service and does not care how it works.',
    bullets: [
      'Troubleshoot POS and iPad problems in a high-volume restaurant, usually while service is running.',
      'Onboard staff onto new digital tools, which is less a training problem than a trust problem.',
      'Build the reporting trackers the team actually uses, rather than the ones that look thorough.',
      'Communicate fixes to non-technical users — the skill that transfers most directly to writing documentation developers will read.',
    ],
    stack: ['Troubleshooting', 'Reporting', 'Technical Support', 'Process Improvement'],
  },
]
