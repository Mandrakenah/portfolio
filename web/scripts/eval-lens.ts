import { readFileSync } from 'node:fs'
import { SearchEngine } from '../src/lib/ml/search'
import { matchJobDescription } from '../src/lib/ml/matcher'
import { buildLexicon } from '../src/content/corpus'

const engine = new SearchEngine(JSON.parse(readFileSync('public/models/index.json', 'utf8')))
const lex = buildLexicon()

const JD = `
Software Developer Intern — Winter 2027

About us: We are an equal opportunity employer. We offer competitive salary and benefits.

Responsibilities:
- Develop and maintain features in a React and TypeScript codebase
- Build REST APIs using Node.js and Express
- Write unit and integration tests to ensure code quality
- Collaborate with designers and product managers in an Agile environment
- Participate in code reviews and contribute to technical documentation

Requirements:
- Currently enrolled in a Computer Science or Software Engineering program
- Strong knowledge of JavaScript, HTML and CSS
- Experience with a relational database such as PostgreSQL
- Familiarity with Docker and Kubernetes is a plus
- Exposure to machine learning frameworks such as PyTorch is an asset
- Excellent communication skills
`

const r = matchJobDescription(JD, engine, lex)
console.log(`overall ${(r.overall * 100).toFixed(0)}%  ·  ${r.strong} strong / ${r.partial} partial / ${r.gaps} gap  ·  ${r.ms.toFixed(1)}ms\n`)
for (const q of r.requirements) {
  const badge = { strong: '██ STRONG', partial: '▒▒ PARTIAL', gap: '░░ GAP    ' }[q.verdict]
  console.log(`${badge}  ${q.text.slice(0, 78)}`)
  q.evidence.slice(0, 1).forEach((e) => console.log(`             ← ${e.doc.sourceLabel}: ${e.doc.text.slice(0, 66)}…`))
}
console.log('\nmatched tech:', r.matchedTech.join(', '))
console.log('missing tech:', r.missingTech.join(', '))
