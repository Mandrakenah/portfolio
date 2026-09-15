import { readFileSync } from 'node:fs'
import { Predictor } from '../src/lib/ml/predictor'
const pr = new Predictor(JSON.parse(readFileSync('public/models/lm-general.json', 'utf8')))
const tests = [
  'thank you for', 'I would like to', 'let me know if', 'I am writing to',
  'please let me', 'looking forward to', 'I hope you', 'sorry for the',
  'can you please', 'I will be', 'it was a', 'we need to', 'what do you',
  'I think that', 'the best way to',
]
for (const t of tests) {
  const p = pr.predict(t + ' ', 3)
  console.log(`"${t} …"  →  ${p.length ? p.map(x=>`${x.word} ${(x.share*100).toFixed(0)}%`).join('  ·  ') : '(none)'}`)
}
console.log('\n── multi-word greedy continuation (the Smart Compose effect) ──')
for (const t of ['thank you for', 'I would like', 'please let me', 'I am writing']) {
  console.log(`  "${t}" → "${pr.extend(t, 6)}"`)
}
