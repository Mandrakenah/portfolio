import type { SearchEngine } from './search'
import type { IndexDoc } from './types'

export type Requirement = {
  id: number
  text: string
  /** normalised 0–1 confidence that Arjun's corpus answers this line */
  score: number
  verdict: 'strong' | 'partial' | 'gap'
  evidence: { doc: IndexDoc; strength: number }[]
  /** technologies this line names that the corpus does not contain */
  missingTech: string[]
  /** technologies this line names that the corpus does contain */
  matchedTech: string[]
  /** named tech I do not have, but hold a genuine relative of */
  adjacentTech: { tech: string; via: string }[]
}

export type MatchReport = {
  requirements: Requirement[]
  overall: number
  strong: number
  partial: number
  gaps: number
  /** technologies named in the posting that appear nowhere in the corpus */
  missingTech: string[]
  matchedTech: string[]
  ms: number
}

const BOILERPLATE =
  /\b(equal opportunity|we offer|benefits|401k|dental|vacation|apply now|about us|our mission|salary|compensation|referral|accommodation|background check|drug (test|screen))\b/i

// Stems, deliberately without a trailing \b: "collaborat" has to match
// "Collaborate" and "familiar" has to match "Familiarity".
const REQUIREMENT_HINT = new RegExp(
  '\\b(?:' +
    [
      'experienc', 'proficien', 'familiar', 'knowledg', 'skill', 'abilit', 'able to',
      'strong', 'solid', 'understand', 'demonstrat', 'working with', 'exposure',
      'degree', 'diploma', 'enrolled', 'student', 'program', 'year',
      'must', 'should', 'requir', 'preferr', 'plus', 'asset', 'bonus',
      'responsib', 'develop', 'build', 'design', 'maintain', 'collaborat',
      'test', 'deploy', 'writ', 'support', 'contribut', 'review', 'communicat',
      'participat', 'document', 'agile', 'scrum', 'mentor', 'troubleshoot', 'optimi',
    ].join('|') +
    ')',
  'i',
)

/** Pull the lines out of a posting that actually state a requirement. */
export function extractRequirements(jd: string): string[] {
  const lines = jd
    .split(/\r?\n|(?<=[.;])\s+(?=[A-Z])|[•·▪]|(?:^|\s)[-–—*]\s+/gm)
    .map((l) => l.replace(/^[\s\-–—*•·\d.)]+/, '').trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    const wordList = l.split(/\s+/)
    const words = wordList.length
    if (words < 3 || words > 60) continue
    if (BOILERPLATE.test(l)) continue
    if (/:\s*$/.test(l)) continue // section heading ("Responsibilities:")
    // A short Title Case line is the job title, not something to match against
    const titleCase = words <= 6 && wordList.every((w) => /^[A-Z0-9(&/—-]/.test(w))
    if (titleCase) continue
    if (!REQUIREMENT_HINT.test(l)) continue
    const key = l.toLowerCase().slice(0, 60)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(l.length > 240 ? l.slice(0, 240) + '…' : l)
    if (out.length >= 24) break
  }

  // Fall back to plain sentences if the posting had no recognisable structure
  if (out.length < 3) {
    for (const s of jd.split(/(?<=[.!?])\s+/)) {
      const t = s.trim()
      if (t.split(/\s+/).length >= 4 && !BOILERPLATE.test(t) && !seen.has(t.toLowerCase().slice(0, 60))) {
        seen.add(t.toLowerCase().slice(0, 60))
        out.push(t.slice(0, 240))
      }
      if (out.length >= 12) break
    }
  }
  return out
}

/**
 * Score a posting against the evidence corpus.
 *
 * Deliberately reports gaps. A matcher that tells every recruiter I am a
 * 98% fit is a horoscope; the useful output is which lines I cannot answer.
 */
/** Technologies explicitly named in a line, split by whether the corpus has them. */
function namedTech(line: string, lexicon: string[]) {
  const l = ` ${line.toLowerCase()} `
  const known = new Set(lexicon.map((x) => x.toLowerCase()))
  // True aliases: different spelling for the same thing.
  const ALIASES: Record<string, string> = { node: 'node.js', rest: 'rest api design' }
  // Adjacent: a real relative in the corpus, but claiming it as equivalent
  // would be a lie. Knowing SQL is not PostgreSQL production experience.
  const ADJACENT: Record<string, string> = {
    postgres: 'SQL', postgresql: 'SQL', mysql: 'SQL',
    jest: 'Vitest', cypress: 'Vitest', playwright: 'Vitest',
    vue: 'React', angular: 'React', svelte: 'React',
    pytorch: 'TensorFlow / Keras', azure: 'AWS', gcp: 'AWS',
    fastify: 'Express', nestjs: 'Express',
  }
  const hit: string[] = []
  const miss: string[] = []
  const adjacent: { tech: string; via: string }[] = []
  for (const tech of TECH_UNIVERSE) {
    if (!new RegExp(`[^a-z0-9.+#]${tech.replace(/[.+#]/g, '\\$&')}[^a-z0-9.+#]`).test(l)) continue
    const canonical = ALIASES[tech] ?? tech
    if (known.has(canonical) || known.has(tech)) {
      hit.push(tech)
    } else if (ADJACENT[tech] && known.has(ADJACENT[tech].toLowerCase())) {
      adjacent.push({ tech, via: ADJACENT[tech] })
    } else {
      miss.push(tech)
    }
  }
  return { hit: [...new Set(hit)], miss: [...new Set(miss)], adjacent }
}

export function matchJobDescription(jd: string, engine: SearchEngine, lexicon: string[]): MatchReport {
  const t0 = performance.now()
  const lines = extractRequirements(jd)

  const STRONG = 3.2
  const PARTIAL = 1.35

  const requirements: Requirement[] = lines.map((text, id) => {
    const tech = namedTech(text, lexicon)
    let hits = engine.search(text, 5)

    // When a line names technologies I do have, evidence that actually mentions
    // one of them beats evidence that merely shares English with the sentence.
    if (tech.hit.length) {
      hits = [...hits].sort((a, b) => {
        const has = (h: typeof a) =>
          tech.hit.some((t) =>
            `${h.doc.text} ${h.doc.tags.join(' ')}`.toLowerCase().includes(t),
          )
            ? 1
            : 0
        return has(b) - has(a) || b.score - a.score
      })
    }

    const raw = hits[0]?.score ?? 0
    let verdict: Requirement['verdict'] = raw >= STRONG ? 'strong' : raw >= PARTIAL ? 'partial' : 'gap'

    // A high BM25 score on common words is not evidence. Promote to "strong"
    // only when the overlap includes terms that are actually rare in the
    // corpus, or when the line names a technology I demonstrably have.
    const distinctive = (hits[0]?.matchedTerms ?? []).filter((t) => engine.idfOf(t) >= 2.2)
    if (verdict === 'strong' && !tech.hit.length && distinctive.length < 2) {
      verdict = 'partial'
    }

    // Technology veto. A line demanding PostgreSQL is not answered by a
    // sentence that happens to share the word "experience". If the posting
    // names tools absent from the corpus, say so instead of claiming a match.
    if (tech.miss.length && !tech.hit.length) verdict = 'gap'
    else if (tech.miss.length && verdict === 'strong') verdict = 'partial'
    // An adjacent technology is honest partial credit, never a strong match.
    if (tech.adjacent.length && !tech.hit.length) verdict = verdict === 'gap' ? 'partial' : 'partial'

    return {
      id,
      text,
      score: verdict === 'gap' ? 0 : Math.min(raw / STRONG, 1),
      verdict,
      missingTech: tech.miss,
      matchedTech: tech.hit,
      adjacentTech: tech.adjacent,
      evidence: verdict === 'gap' && !tech.adjacent.length ? [] : hits.slice(0, 2).map((h) => ({ doc: h.doc, strength: h.strength })),
    }
  })

  const strong = requirements.filter((r) => r.verdict === 'strong').length
  const partial = requirements.filter((r) => r.verdict === 'partial').length
  const gaps = requirements.filter((r) => r.verdict === 'gap').length

  // Technology names in the posting, split by whether the corpus knows them
  const jdLower = ` ${jd.toLowerCase()} `
  const matchedTech = lexicon.filter((t) => jdLower.includes(` ${t.toLowerCase()}`))
  const missingTech = extractUnknownTech(jdLower, lexicon)

  const overall = requirements.length
    ? (strong + partial * 0.5) / requirements.length
    : 0

  return {
    requirements,
    overall,
    strong,
    partial,
    gaps,
    matchedTech,
    missingTech,
    ms: performance.now() - t0,
  }
}

/** Common technologies a posting might name that are absent from the corpus. */
const TECH_UNIVERSE = [
  'react','angular','vue','svelte','next.js','node','express','nestjs','django','flask','fastapi',
  'spring','rails','laravel','php','ruby','go','golang','rust','c#','.net','java','kotlin','swift',
  'python','typescript','javascript','sql','postgres','postgresql','mysql','mongodb','redis',
  'graphql','rest','grpc','docker','kubernetes','terraform','aws','azure','gcp','jenkins','github actions',
  'ci/cd','kafka','rabbitmq','elasticsearch','spark','hadoop','airflow','tableau','power bi','figma',
  'tailwind','sass','webpack','vite','jest','vitest','cypress','playwright','selenium','pytorch',
  'tensorflow','scikit-learn','pandas','numpy','sagemaker','databricks','snowflake','salesforce','sap',
]

function extractUnknownTech(jdLower: string, lexicon: string[]): string[] {
  const known = new Set(lexicon.map((l) => l.toLowerCase()))
  const out: string[] = []
  for (const tech of TECH_UNIVERSE) {
    if (!jdLower.includes(` ${tech}`)) continue
    if (known.has(tech)) continue
    // treat obvious aliases as known
    if (tech === 'node' && known.has('node.js')) continue
    if (tech === 'rest' && known.has('rest api design')) continue
    if (tech === 'postgres' && known.has('sql')) continue
    if (tech === 'postgresql' && known.has('sql')) continue
    if (tech === 'mysql' && known.has('sql')) continue
    out.push(tech)
  }
  return [...new Set(out)].slice(0, 12)
}
