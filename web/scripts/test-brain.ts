import { readFileSync } from 'node:fs'
import { TinyGPT, type Manifest } from '../src/lib/ml/tinygpt'
import { SearchEngine } from '../src/lib/ml/search'

const manifest = JSON.parse(readFileSync('public/models/tinygpt.json','utf8')) as Manifest
const raw = readFileSync('public/models/tinygpt.bin')
const gpt = new TinyGPT(manifest, raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength) as ArrayBuffer)
const idx = JSON.parse(readFileSync('public/models/index.json','utf8'))
const bm25 = new SearchEngine(idx)

// how much of Arjun's technical vocabulary does a model trained on novels even know?
const techTerms = ['react','typescript','api','firebase','vitest','monorepo','openapi','accessibility','deployment','testing','database','node','component','javascript','python']
const known = techTerms.filter(t => gpt.tokenize(t)[0] !== 0)
console.log(`transformer vocabulary coverage of technical terms: ${known.length}/${techTerms.length}`)
console.log(`  known  : ${known.join(', ') || '(none)'}`)
console.log(`  unknown: ${techTerms.filter(t=>!known.includes(t)).join(', ')}`)

const cos = (a: Float32Array, b: Float32Array) => { let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s }
const docs = idx.docs as { id:string; text:string; sourceLabel:string }[]
console.log('\nembedding the corpus with the transformer…')
const t0 = Date.now()
const vecs = docs.map(d => gpt.embed(d.text))
console.log(`  ${docs.length} documents in ${Date.now()-t0}ms\n`)

const queries = ['does he write tests','cloud deployment','accessibility work','React and TypeScript']
for (const q of queries) {
  const qv = gpt.embed(q)
  const neural = docs.map((d,i)=>({d, s:cos(qv, vecs[i])})).sort((a,b)=>b.s-a.s).slice(0,2)
  const lexical = bm25.search(q, 2)
  console.log(`▸ "${q}"`)
  console.log(`   neural : ${neural.map(n=>`[${n.d.sourceLabel}] ${n.d.text.slice(0,52)}…`).join('\n              ')}`)
  console.log(`   BM25   : ${lexical.map(h=>`[${h.doc.sourceLabel}] ${h.doc.text.slice(0,52)}…`).join('\n              ')}`)
  console.log()
}
