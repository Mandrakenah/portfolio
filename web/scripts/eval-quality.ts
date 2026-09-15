import { readFileSync } from 'node:fs'
import { TinyGPT, type Manifest } from '../src/lib/ml/tinygpt'
const manifest = JSON.parse(readFileSync('public/models/tinygpt.json','utf8')) as Manifest
const raw = readFileSync('public/models/tinygpt.bin')
const m = new TinyGPT(manifest, raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength) as ArrayBuffer)

const tech = ['react','typescript','api','component','server','function','database','render','javascript','python','testing','deployment','interface','async','framework']
const known = tech.filter(t => m.tokenize(t)[0] !== 0)
console.log(`technical vocabulary: ${known.length}/${tech.length} known  (was 0/15)`)
console.log(`  known: ${known.join(', ')}`)
console.log(`  still unknown: ${tech.filter(t=>!known.includes(t)).join(', ') || 'none'}`)

console.log('\n── everyday phrasing ──')
for (const t of ['thank you for your','I would like to','what do you','please let me','I am writing to','looking forward to','I hope you are','can you help me']) {
  const s = m.suggest(t, 5)
  console.log(`  "${t}"${s ? ` →${s}` : ' → (no suggestion)'}`)
}
console.log('\n── software English ──')
for (const t of ['the component is','this function returns','you can use the','the api is','to install the']) {
  const s = m.suggest(t, 5)
  console.log(`  "${t}"${s ? ` →${s}` : ' → (no suggestion)'}`)
}
