import type { SkillGroup } from './types'

/** level 3 = built production work with it · 2 = working proficiency · 1 = familiar */
export const skillGroups: SkillGroup[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    items: [
      { name: 'React', level: 3, note: 'Production monorepo work, hooks-first, RSC-aware' },
      { name: 'TypeScript', level: 3, note: 'Strict mode by default; typed API boundaries' },
      { name: 'Next.js', level: 3, note: 'App Router, server components, Turbopack' },
      { name: 'JavaScript', level: 3 },
      { name: 'Tailwind CSS', level: 3 },
      { name: 'Motion / animation', level: 2, note: 'Scroll-driven timelines, view transitions' },
      { name: 'Three.js / WebGL', level: 2, note: 'react-three-fiber scenes' },
      { name: 'HTML & CSS', level: 3, note: 'Semantics and accessibility, not just layout' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend & Data',
    items: [
      { name: 'Node.js', level: 3 },
      { name: 'Express', level: 3, note: 'REST APIs with validation at the boundary' },
      { name: 'MongoDB / Mongoose', level: 3, note: 'Schema design, Atlas deployments' },
      { name: 'REST API design', level: 3 },
      { name: 'SQL', level: 2 },
      { name: 'FastAPI', level: 2, note: 'Python inference services' },
      { name: 'Authentication flows', level: 2, note: 'Sessions, email confirmation, MSAL' },
    ],
  },
  {
    id: 'ml',
    label: 'Machine Learning',
    items: [
      { name: 'Python', level: 3 },
      { name: 'scikit-learn', level: 3 },
      { name: 'TensorFlow / Keras', level: 2, note: 'Regression and classification networks' },
      { name: 'pandas / NumPy', level: 3 },
      { name: 'NLP & embeddings', level: 2, note: 'Sentence transformers, n-gram LMs, TF-IDF' },
      { name: 'AWS machine learning', level: 2, note: 'Cloud training pipelines' },
      { name: 'Model evaluation', level: 2, note: 'AUC over accuracy on imbalanced data' },
    ],
  },
  {
    id: 'practice',
    label: 'Engineering Practice',
    items: [
      { name: 'Git & code review', level: 3 },
      { name: 'Vitest / testing', level: 3, note: 'Component tests against real network contracts' },
      { name: 'Mock Service Worker', level: 2 },
      { name: 'Technical writing', level: 3, note: 'Standards, ADRs, documentation' },
      { name: 'Agile / Scrum', level: 2 },
      { name: 'Project management', level: 2, note: 'PMBOK planning; led a four-person team' },
      { name: 'Java', level: 2 },
    ],
  },
]
