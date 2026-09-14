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

  headline: 'I build full-stack systems, and I ship the machine learning inside them.',

  intro:
    'I am a final-year Software Engineering Technology (Artificial Intelligence) student at Centennial College and a full-stack developer. I spent this summer as a frontend co-op on a production React and TypeScript monorepo, where I replaced hand-written API calls with generated, type-safe clients and cut about 60% of the code out of each component. I care about the unglamorous parts: typed contracts, tests that catch real regressions, and interfaces that stay fast and reachable on a mid-range phone.',

  about: [
    'I did not come to software through the usual door. I spent years working in a professional kitchen, and a kitchen teaches you things a lecture cannot. You learn to work a station under load. You learn that the person expediting needs information before they ask for it. You learn that consistency is a skill, not a personality trait. I still work at that restaurant, now on the data and tech side, and the useful part of the job is explaining a fix to someone who is mid-service and does not care how it works. That is the same skill as writing documentation another developer will actually read.',
    'At AiFinancial I found the interesting problem was not any single feature. It was that the frontend and the backend disagreed about what the API promised, and nobody could see the disagreement until something broke in production. So I evaluated four approaches to closing that gap, wrote the trade-offs up as an architecture decision record, presented it to the other teams, and then built the thing: generated TypeScript clients straight from the OpenAPI spec, wired into TanStack Query, tested against a mock server that speaks the real contract. Each migrated component lost about sixty percent of its code. The point was never the line count — it was that the compiler now catches what code review used to miss.',
    'At STEMflower I learned that accessibility work is mostly archaeology. Someone had baked the text of fourteen screens into background images, which looks fine and is invisible to a screen reader, unsearchable, and unzoomable. Getting that copy back out into real DOM text through a pngjs pipeline was the least glamorous thing I did all summer and probably the most useful. In the same codebase I closed three privilege-escalation holes in the Firestore rules and two XSS vectors, and left behind 264 automated checks so the next person would find out before the classroom did.',
    'My program is the artificial intelligence stream, so I have spent as much time in notebooks as in editors — training networks to predict student outcomes, building churn models on AWS, and sitting with the honest reality that a model at eighty-six percent accuracy is a starting point rather than a finish line. What I care about is the seam between the two disciplines. A model that never reaches a user is a research artifact. An interface with nothing intelligent behind it is a brochure.',
    'This site is my argument for that seam. The search is not keyword matching. The typing box predicts my next word using a model trained on my own writing. Paste a job description and it will tell you where I match and, more usefully, where I do not. Nothing here calls out to a paid language model — every prediction runs on your device, which is the constraint that made it worth building.',
  ],

  socials: [
    { label: 'GitHub', href: 'https://github.com/Mandrakenah', handle: '@Mandrakenah' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/arjun-saji-55655630b/', handle: 'arjun-saji' },
    { label: 'Email', href: 'mailto:arjun000saji@gmail.com', handle: 'arjun000saji@gmail.com' },
  ],

  education: {
    school: 'Centennial College',
    campus: 'Progress Campus, Toronto',
    credential: 'Advanced Diploma, Software Engineering Technology — Artificial Intelligence',
    span: 'Sept 2023 — Dec 2026',
    gpa: '3.93 / 4.5',
    coursework: [
      'Client-Side Web Development',
      'Web Interface Design',
      'Web Application Development',
      'Mobile Apps Development',
      'Software Testing & Quality',
      'Data Structures & Algorithms',
      'Software Systems Design',
      'Software Requirements Engineering',
      'IT Project Management',
    ],
  },
} as const
