import { readFileSync } from 'node:fs'
import { TinyGPT, type Manifest } from '../src/lib/ml/tinygpt'
const manifest = JSON.parse(readFileSync('public/models/tinygpt.json','utf8')) as Manifest
const raw = readFileSync('public/models/tinygpt.bin')
const m = new TinyGPT(manifest, raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength) as ArrayBuffer)

console.log('── ghost text from the transformer ──')
for (const t of ['what do you','I would like to','thank you for your','he looked at the','she said that she','the house was very']) {
  const t0=performance.now(); const s=m.suggest(t); const ms=performance.now()-t0
  console.log(`  "${t}"${s ? ` →${s}` : ' → (none)'}   [${ms.toFixed(0)}ms]`)
}
console.log('\n── latency ──')
const t0=performance.now(); for(let i=0;i<10;i++) m.topK('what do you think about the',1); 
console.log(`  single next-word : ${((performance.now()-t0)/10).toFixed(0)} ms`)
const t1=performance.now(); for(let i=0;i<5;i++) m.suggest('I would like to');
console.log(`  full suggestion  : ${((performance.now()-t1)/5).toFixed(0)} ms`)
const t2=performance.now(); m.embed('React and TypeScript component testing');
console.log(`  sentence embed   : ${(performance.now()-t2).toFixed(0)} ms`)
