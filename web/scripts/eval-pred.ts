import { readFileSync } from 'node:fs'
import { Predictor } from '../src/lib/ml/predictor'
const pr = new Predictor(JSON.parse(readFileSync('public/models/lm.json', 'utf8')))
for (const c of ['I built', 'I built ', 'the hardest part was', 'react and type', 'I like', 'zzzz']) {
  const p = pr.predict(c, 4)
  console.log(`"${c}" →`, p.length ? p.map((x) => `${x.word}(${(x.share*100).toFixed(0)}%/o${x.order})`).join(' ') : '(none)')
}
