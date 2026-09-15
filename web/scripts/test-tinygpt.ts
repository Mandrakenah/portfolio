import { readFileSync } from 'node:fs'
import { TinyGPT, type Manifest } from '../src/lib/ml/tinygpt'

const manifest = JSON.parse(readFileSync('public/models/tinygpt.json', 'utf8')) as Manifest
const raw = readFileSync('public/models/tinygpt.bin')
const weights = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
const ref = JSON.parse(readFileSync('scripts/reference.json', 'utf8'))

const m = new TinyGPT(manifest, weights as ArrayBuffer)
console.log(`loaded: ${(manifest.training.params/1e6).toFixed(2)}M params, held-out ppl ${manifest.training.valPerplexity}\n`)

let agree = 0, total = 0
for (const [text, r] of Object.entries<any>(ref)) {
  const ids = m.tokenize(text)
  const sameTok = JSON.stringify(ids) === JSON.stringify(r.ids)
  const t0 = performance.now()
  const logits = m.forward(ids)
  const ms = performance.now() - t0

  const order = Array.from({ length: logits.length }, (_, i) => i).sort((a, b) => logits[b] - logits[a])
  const tsTop = order.slice(0, 8).map((i) => manifest.vocab[i])
  const overlap = tsTop.filter((w) => r.topWords.includes(w)).length
  agree += overlap; total += 8

  const mean = logits.reduce((a, b) => a + b, 0) / logits.length
  console.log(`"${text}"`)
  console.log(`   tokenizer match : ${sameTok ? 'yes' : 'NO — ' + JSON.stringify(ids)}`)
  console.log(`   torch top-5     : ${r.topWords.slice(0,5).join(', ')}`)
  console.log(`   ts    top-5     : ${tsTop.slice(0,5).join(', ')}`)
  console.log(`   top-8 overlap   : ${overlap}/8`)
  console.log(`   logit mean      : torch ${r.logitMean}  ts ${mean.toFixed(4)}`)
  console.log(`   forward         : ${ms.toFixed(0)} ms\n`)
}
console.log(`OVERALL top-8 agreement: ${agree}/${total} (${(agree/total*100).toFixed(0)}%)`)
console.log(`(exact match is not expected — the browser runs int8 weights, torch ran float32)`)
