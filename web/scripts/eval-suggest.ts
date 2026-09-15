import { readFileSync } from 'node:fs'
import { Predictor } from '../src/lib/ml/predictor'
const g = new Predictor(JSON.parse(readFileSync('public/models/lm-general.json', 'utf8')))
console.log('── ghost text the general n-gram would show ──')
for (const t of ['I would like to','thank you for your','what do you','we need to','I hope you are','can you sen','the best','I am inter']) {
  const s = g.suggest(t)
  console.log(`  "${t}" ${s ? `→ ghost:"${s}"` : '→ (no suggestion)'}`)
}
