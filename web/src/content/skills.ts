import type { SkillGroup } from './types'

/** level 3 = built production work with it · 2 = working proficiency · 1 = familiar */
export const skillGroups: SkillGroup[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    items: [
      { name: 'React', level: 3, note: 'Production monorepo work, hooks-first' },
      { name: 'TypeScript', level: 3, note: 'Strict mode by default; typed API boundaries' },
      { name: 'JavaScript', level: 3 },
      { name: 'Next.js', level: 3, note: 'App Router, server components, Turbopack' },
      { name: 'HTML & CSS', level: 3, note: 'Semantics and accessibility, not just layout' },
      { name: 'Tailwind CSS', level: 3 },
      { name: 'TanStack Query', level: 3, note: 'Generated hooks against an OpenAPI contract' },
      { name: 'Zustand', level: 2, note: 'State for large interactive graphs' },
      { name: 'Vite', level: 2 },
      { name: 'Accessibility (WCAG)', level: 2, note: 'Recovered screen-reader access from baked-in image text' },
      { name: 'Internationalization', level: 2, note: 'Shipped a bilingual English/French interface' },
      { name: 'Three.js / WebGL', level: 2, note: 'react-three-fiber scenes' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend & Data',
    items: [
      { name: 'Node.js', level: 3 },
      { name: 'Express', level: 3, note: 'REST APIs with validation at the boundary' },
      { name: 'REST & OpenAPI', level: 3, note: 'Contract-first clients generated with Orval' },
      { name: 'MongoDB / Mongoose', level: 3, note: 'Schema design, Atlas deployments' },
      { name: 'Firebase', level: 2, note: 'Firestore, Auth, and security rules I have had to harden' },
      { name: 'SQL', level: 2 },
      { name: 'Authentication', level: 2, note: 'Sessions, email confirmation, MSAL token flows' },
      { name: 'Java / Spring Boot', level: 1, note: 'Worked alongside it cross-team' },
    ],
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    items: [
      { name: 'Python', level: 3 },
      { name: 'scikit-learn', level: 2 },
      { name: 'pandas / NumPy', level: 2 },
      { name: 'TensorFlow / Keras', level: 2, note: 'Regression and classification networks' },
      { name: 'NLP & retrieval', level: 2, note: 'n-gram language models, BM25, TF-IDF, SVD' },
      { name: 'AWS machine learning', level: 2, note: 'Cloud training pipelines' },
      { name: 'Model evaluation', level: 2, note: 'AUC over accuracy on imbalanced data' },
    ],
  },
  {
    id: 'practice',
    label: 'Engineering Practice',
    items: [
      { name: 'Testing', level: 3, note: 'Vitest, Playwright, jsdom, MSW — unit through end-to-end' },
      { name: 'Git & code review', level: 3, note: 'Rebase, feature branching, PR review' },
      { name: 'Technical writing', level: 3, note: 'ADRs, standards, documentation others read' },
      { name: 'Debugging', level: 3, note: 'Cross-browser, network layer, auth token flows' },
      { name: 'Agile (Scrum / Kanban)', level: 2, note: 'Sprint-based delivery in cross-functional teams' },
      { name: 'Docker & CI/CD', level: 2 },
      { name: 'Usability testing', level: 2, note: 'Ran sessions with teachers, shipped what they revealed' },
      { name: 'Kotlin / Jetpack Compose', level: 2, note: 'Android Studio' },
      { name: 'C#', level: 2 },
    ],
  },
]
