import { readFileSync } from 'node:fs'
import { SearchEngine } from '../src/lib/ml/search'
const se = new SearchEngine(JSON.parse(readFileSync('public/models/index.json', 'utf8')))
for (const q of ['accessibility', 'security vulnerabilities', 'OpenAPI code generation', 'usability testing', 'Firebase']) {
  const h = se.search(q, 2)
  console.log(`\n▸ "${q}"`)
  h.forEach(x => console.log(`   ${(x.strength*100).toFixed(0).padStart(3)}%  [${x.doc.sourceLabel}] ${x.doc.text.slice(0,72)}…`))
  if (!h.length) console.log('   (none)')
}
