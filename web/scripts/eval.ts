import { readFileSync } from 'node:fs'
import { SearchEngine } from '../src/lib/ml/search'
import { Predictor } from '../src/lib/ml/predictor'

const idx = JSON.parse(readFileSync('public/models/index.json', 'utf8'))
const lm = JSON.parse(readFileSync('public/models/lm.json', 'utf8'))
const se = new SearchEngine(idx)
const pr = new Predictor(lm)

console.log('══ SEARCH ══')
for (const q of [
  'real-time data',
  'has he shipped production TypeScript',
  'machine learning experience',
  'does he write tests',
  'leadership and mentoring',
  'typescrpt',            // typo
  'database schema design',
  'cloud deployment AWS',
]) {
  const hits = se.search(q, 3)
  console.log(`\n▸ "${q}"`)
  if (!hits.length) { console.log('   (no hits)'); continue }
  for (const h of hits) {
    console.log(`   ${(h.strength * 100).toFixed(0).padStart(3)}%  [${h.doc.sourceLabel}]`)
    console.log(`         ${h.doc.text.slice(0, 88)}…`)
  }
}

console.log('\n\n══ NEXT-WORD PREDICTION ══')
for (const ctx of ['I built ', 'The model ', 'I like ', 'my program is an ', 'we normalised every ', 'react and type', 'the hardest part was ']) {
  const p = pr.predict(ctx, 4)
  console.log(`\n▸ "${ctx}…"`)
  console.log('   ' + p.map((x) => `${x.word} (${(x.p * 100).toFixed(1)}% o${x.order})`).join('  ·  '))
}
console.log('\n▸ greedy extension from "I built":')
console.log('   ' + pr.extend('I built', 12))
