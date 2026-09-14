import type { Project } from './types'

export const projects: Project[] = [
  {
    id: 'this-site',
    name: 'This Portfolio',
    tagline: 'A portfolio that runs its own NLP models in your browser',
    year: '2026',
    status: 'live',
    kind: 'ml',
    blurb:
      'Next.js 16 front end with a Python training pipeline. Every intelligent feature on this site runs client-side: transformer embeddings for search, a language model trained on my own writing for next-word prediction, and a requirement-matching engine for job descriptions. No API keys, no per-request cost, no third-party model calls.',
    narrative:
      'Most developer portfolios that advertise artificial intelligence are a text box wired to somebody else\'s API. That is a plumbing exercise. I wanted the models to be mine and to run on the visitor\'s device, because that constraint is what makes the engineering real. The embeddings are computed ahead of time by a Python pipeline and shipped as a quantised vector file. The query embedding is computed in the browser by the same transformer model, so the vectors live in the same space and cosine similarity actually means something. The word predictor is a Kneser-Ney smoothed n-gram model trained on the prose of this site, serialised into a compact trie the browser loads in a few hundred kilobytes. The hardest part was not the modelling, it was the budget: everything has to load fast enough that a recruiter on a phone never notices it happened.',
    highlights: [
      'Transformer sentence embeddings computed at build time in Python and re-computed for queries in-browser with ONNX Runtime Web, so search understands meaning rather than keywords',
      'A Kneser-Ney smoothed n-gram language model trained on my own writing, serialised to a compact trie and running entirely client-side',
      'A job-description matcher that extracts requirements, embeds each one, and maps them onto specific evidence from my work, including the gaps',
      'A UMAP projection of the project embeddings rendered as an interactive WebGL constellation, where distance is semantic distance',
      'A live systems page reporting real latency, model sizes and vector counts rather than a static architecture diagram',
    ],
    stack: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind v4', 'Python', 'sentence-transformers', 'ONNX', 'Three.js', 'Motion'],
    metrics: [
      { label: 'model calls to third parties', value: '0' },
      { label: 'inference location', value: 'your device' },
    ],
  },
  {
    id: 'flowtrace',
    name: 'FlowTrace',
    tagline: 'Local-first visual problem mapping',
    year: '2026',
    status: 'active',
    kind: 'tool',
    blurb:
      'A canvas tool for breaking a tangled problem into nodes and tracing the dependencies between them. Everything stays on your machine. No account, no sync, no server that can go down or read your work.',
    narrative:
      'I built FlowTrace because I kept reaching for a whiteboard to untangle problems and kept losing the whiteboard. The existing tools all wanted an account and a cloud document. For thinking-in-progress that felt wrong, so I made the storage local-first by default. The interesting engineering is in the graph layer: automatic layout with dagre that has to feel deliberate rather than jumpy, an undo system that survives layout recalculation, and state management that keeps a large graph at sixty frames per second while nodes are being dragged. I held it to a real test suite, over sixty specs, because a tool you trust with your thinking has to behave predictably.',
    highlights: [
      'Directed-graph canvas built on @xyflow/react with automatic dagre layout that preserves the user\'s mental map between relayouts',
      'Local-first persistence with no backend, no account and no network dependency',
      'Zustand state architecture tuned to keep large graphs interactive during drag',
      'Test suite of 60+ specs in Vitest covering graph mutations, layout and persistence',
    ],
    stack: ['Vite', 'React 18', 'TypeScript', 'Tailwind', '@xyflow/react', 'Zustand', 'dagre', 'Vitest'],
    metrics: [
      { label: 'test specs', value: '60+' },
      { label: 'backend services', value: '0' },
    ],
  },
  {
    id: 'work-plug',
    name: 'Work Plug',
    tagline: 'A marketplace for skilled trades',
    year: '2024 — present',
    status: 'active',
    kind: 'product',
    blurb:
      'A two-sided platform where skilled workers publish a verifiable profile — trade, rate, availability, service area, past work — and clients search, filter and book them directly.',
    narrative:
      'Work Plug started from watching how skilled tradespeople actually find work, which is word of mouth and luck. Someone new to a city has neither. The product problem is trust in both directions: a client needs to believe the worker is real and competent, and the worker needs to believe the booking is real. So the engineering leans on verification and auth. Full email confirmation flows, session handling, and a booking model that keeps availability and reservations consistent when two clients want the same Saturday. It has also been the project I keep returning to as I learn more, which means it has been rewritten more than once and is the honest record of how my engineering has changed since 2024.',
    highlights: [
      'Two-sided marketplace with distinct worker and client models, search and multi-facet filtering by rate, rating, availability and location',
      'Authentication with email confirmation flows and session handling',
      'Booking model that keeps worker availability consistent under concurrent requests',
      'Also the subject of a full PMBOK project-management study: stakeholder, quality, human resource and communications management plans, which I led as project manager',
    ],
    stack: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Mongoose'],
  },
  {
    id: 'neural-outcomes',
    name: 'Student Outcome Networks',
    tagline: 'Neural networks predicting academic performance',
    year: '2026',
    status: 'academic',
    kind: 'ml',
    blurb:
      'Two neural networks over a student-records dataset: a regression model estimating final GPA, and a classifier identifying high academic achievers early enough for an intervention to matter.',
    narrative:
      'The framing mattered more than the architecture here. A model that predicts who will do well is only useful if it predicts it early, so we constrained the feature set to what a college actually knows about a student in the first weeks rather than what it knows at the end. That cost us accuracy and made the result honest. We normalised every input, used early stopping with patience so the network stopped at its best epoch rather than its last, and checkpointed the best weights instead of trusting the final state. The separate LSTM lab in the same course, generating synthetic code sequences, topped out at 61.68 percent validation accuracy, which taught me more about the limits of a small model on a hard sequence task than a clean result would have.',
    highlights: [
      'GPA regression and high-achiever classification trained on the same normalised feature set',
      'Early stopping with patience and model checkpointing, so the deployed weights are the best epoch rather than the last',
      'Feature normalisation throughout, which is the difference between a sigmoid network that learns and one that stalls',
      'Companion LSTM sequence model reaching 61.68% validation accuracy on synthetic code generation',
    ],
    stack: ['Python', 'TensorFlow', 'Keras', 'scikit-learn', 'pandas', 'NumPy'],
    metrics: [{ label: 'LSTM best val accuracy', value: '61.68%' }],
  },
  {
    id: 'churn-aws',
    name: 'Churn Prediction on AWS',
    tagline: 'Cloud machine learning pipeline',
    year: '2026',
    status: 'academic',
    kind: 'ml',
    blurb:
      'An end-to-end customer churn pipeline built and trained on AWS: ingestion, feature engineering, model selection and evaluation, with a Random Forest reaching 86.25% accuracy and 93.17% AUC.',
    narrative:
      'The point of this project was the pipeline rather than the model. Anyone can fit a Random Forest in a notebook. Doing it on cloud infrastructure means confronting the parts a notebook hides: where the data lives, what the training job costs, how you get the artifact back out, and who is allowed to touch any of it. The accuracy number is respectable, but the AUC of 93.17 percent is the one I would quote, because churn data is imbalanced and accuracy flatters a model that mostly predicts the majority class.',
    highlights: [
      'Full pipeline on AWS from ingestion through evaluation',
      'Random Forest at 86.25% accuracy and 93.17% AUC, with AUC treated as the meaningful metric on imbalanced data',
      'Comparative model selection rather than fitting one estimator and reporting it',
    ],
    stack: ['AWS', 'Python', 'scikit-learn', 'pandas'],
    metrics: [
      { label: 'accuracy', value: '86.25%' },
      { label: 'AUC', value: '93.17%' },
    ],
  },
  {
    id: 'rars',
    name: 'RARS',
    tagline: 'Automatic emergency alerting after a collision',
    year: '2024',
    status: 'archived',
    kind: 'product',
    blurb:
      'A road-accident response system that detects a collision and automatically sends the location and situation to emergency services and to the driver\'s family, for the case where the driver cannot make the call themselves.',
    narrative:
      'RARS came from a straightforward observation: the most dangerous window after a crash is the one before anyone knows it happened. The design problem is false positives. An alert system that calls emergency services every time a phone is dropped is worse than useless, so the logic has to hold a confirmation window and let a conscious driver cancel before anything is sent. That tension — respond fast, but do not cry wolf — is the whole product.',
    highlights: [
      'Collision detection with a cancellation window to suppress false positives before any alert is sent',
      'Automatic dispatch of location and incident detail to emergency services and designated family contacts',
      'Designed around the case where the user is unable to interact with the device at all',
    ],
    stack: ['JavaScript', 'Node.js', 'Geolocation APIs', 'SMS APIs'],
  },
  {
    id: 'incident-record',
    name: 'Incident Record',
    tagline: 'IT service management ticketing',
    year: '2025',
    status: 'archived',
    kind: 'product',
    blurb:
      'A ticketing system for IT teams: log system failures, software bugs and network problems, assign them to technicians, and track resolution to keep downtime measurable.',
    narrative:
      'A clean full-stack build with a real domain model. The value is not in the CRUD, it is in the state machine: an incident has a lifecycle, and the interesting bugs live in the transitions — reassignment mid-resolution, closure without a root cause, reopening a ticket that has already been reported as resolved.',
    highlights: [
      'Incident lifecycle with assignment, status transitions and resolution tracking',
      'React front end against a Node and Express API with MongoDB Atlas persistence',
      'Full CRUD with validation at the API boundary rather than only in the form',
    ],
    stack: ['React', 'Node.js', 'Express', 'MongoDB Atlas'],
  },
]
