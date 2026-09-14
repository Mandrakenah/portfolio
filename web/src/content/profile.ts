export const profile = {
  name: 'Arjun Saji',
  shortName: 'Arjun',
  role: 'Full-Stack Developer',
  subrole: 'AI & Machine Learning',
  location: 'Toronto, Ontario',
  email: 'arjun000saji@gmail.com',
  phone: '+1 (437) 662-1536',
  status: 'Open to Winter 2027 co-op and new-grad roles',
  graduating: 'December 2026',

  /** one-line positioning */
  headline: 'I build full-stack systems, and I ship the machine learning inside them.',

  /** the elevator paragraph */
  intro:
    'I am a final-year Software Engineering Technology (Artificial Intelligence) student at Centennial College and a full-stack developer. I spent this summer as a frontend co-op on a production React and TypeScript monorepo, where I wrote the component standard the team builds against. I care about the unglamorous parts: typed contracts, tests that catch real regressions, and interfaces that stay fast on a mid-range phone.',

  /** longer prose — also feeds the language model */
  about: [
    'I did not come to software through the usual door. I spent years working line in a professional kitchen, and a kitchen teaches you things a lecture cannot. You learn to work a station under load. You learn that the person expediting needs information before they ask for it. You learn that consistency is a skill, not a personality trait. When several cooks called in sick during a Friday service, I batched similar orders, kept the expo station informed, and covered two stations without dropping quality. That is the same instinct I bring to a sprint.',
    'The engineering came next, and it stuck. I like the moment a vague requirement turns into a typed interface. I like deleting code. I like the particular satisfaction of a test that fails for the right reason. At AiFinancial I inherited a large React and TypeScript monorepo and found that the hardest problem was not any single feature, it was that fourteen developers were each solving the same structural problems differently. So I wrote the standard. Fourteen rules, three parts, an audit spreadsheet, and a guide the team could actually read.',
    'My program is an artificial intelligence stream, so I have spent as much time in notebooks as in editors. I have trained neural networks to predict student academic outcomes, built churn models on AWS, and worked through the honest reality that a model at eighty-six percent accuracy is a starting point rather than a finish line. What I care about is the seam between the two disciplines. A model that never reaches a user is a research artifact. An interface with nothing intelligent behind it is a brochure.',
    'This site is my argument for that seam. The search is not keyword matching, it is a transformer embedding computed in your browser. The typing box predicts my next word using a model trained on my own writing. Paste a job description and it will tell you where I match and, more usefully, where I do not. Nothing here calls out to a paid language model. Every prediction on this page runs on your device, which is the constraint that made it interesting to build.',
  ],

  socials: [
    { label: 'GitHub', href: 'https://github.com/', handle: '@arjunsaji' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/', handle: 'arjun-saji' },
    { label: 'Email', href: 'mailto:arjun000saji@gmail.com', handle: 'arjun000saji@gmail.com' },
  ],

  education: {
    school: 'Centennial College',
    campus: 'Progress Campus, Toronto',
    credential: 'Advanced Diploma, Software Engineering Technology — Artificial Intelligence',
    span: '2024 — December 2026',
    gpa: '3.93 / 4.5',
    coursework: [
      'Neural Networks',
      'Cloud Machine Learning',
      'Natural Language Processing',
      'Data Structures & Algorithms',
      'Web Application Development',
      'Mobile Application Development',
      'IT Project Management',
      'Database Design',
    ],
  },
} as const
