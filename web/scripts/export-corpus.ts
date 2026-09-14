/**
 * Exports the TypeScript content corpus to JSON so the Python
 * training pipeline can embed it. Run before training.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEvidence, buildWritingCorpus, buildLexicon } from '../src/content/corpus'
import { projects } from '../src/content/projects'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../../data')
mkdirSync(outDir, { recursive: true })

const evidence = buildEvidence()
const corpus = buildWritingCorpus()
const lexicon = buildLexicon()

writeFileSync(
  resolve(outDir, 'corpus.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      evidence,
      lexicon,
      writing: corpus,
      projects: projects.map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, kind: p.kind, stack: p.stack })),
    },
    null,
    2,
  ),
)

const words = corpus.join(' ').split(/\s+/).filter(Boolean)
console.log(`evidence items  : ${evidence.length}`)
console.log(`lexicon terms   : ${lexicon.length}`)
console.log(`writing segments: ${corpus.length}`)
console.log(`corpus words    : ${words.length}`)
console.log(`unique tokens   : ${new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9'-]/g, ''))).size}`)
console.log(`→ wrote ${resolve(outDir, 'corpus.json')}`)
