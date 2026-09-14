import { profile } from './profile'
import { roles } from './experience'
import { projects } from './projects'
import { skillGroups } from './skills'
import type { Evidence } from './types'

/**
 * Flattens everything into a single embeddable evidence set.
 * This is the corpus that the semantic search, the recruiter lens and the
 * constellation all read from — one source of truth, so a claim can never
 * appear in search and be missing from the matcher.
 */
export function buildEvidence(): Evidence[] {
  const out: Evidence[] = []

  for (const r of roles) {
    out.push({
      id: `role:${r.id}:summary`,
      text: `${r.title} at ${r.company}. ${r.summary}`,
      sourceId: r.id,
      sourceLabel: `${r.company} — ${r.title}`,
      sourceKind: 'role',
      tags: r.stack,
    })
    r.bullets.forEach((b, i) => {
      out.push({
        id: `role:${r.id}:b${i}`,
        text: b,
        sourceId: r.id,
        sourceLabel: `${r.company} — ${r.title}`,
        sourceKind: 'role',
        tags: r.stack,
      })
    })
  }

  for (const p of projects) {
    out.push({
      id: `project:${p.id}:blurb`,
      text: `${p.name}. ${p.tagline}. ${p.blurb}`,
      sourceId: p.id,
      sourceLabel: p.name,
      sourceKind: 'project',
      tags: p.stack,
    })
    p.highlights.forEach((h, i) => {
      out.push({
        id: `project:${p.id}:h${i}`,
        text: `${p.name}: ${h}`,
        sourceId: p.id,
        sourceLabel: p.name,
        sourceKind: 'project',
        tags: p.stack,
      })
    })
  }

  for (const g of skillGroups) {
    for (const s of g.items) {
      // Only index skills that carry a real claim. "Python, used in machine
      // learning work" is filler that outranks actual evidence in BM25.
      if (!s.note) continue
      out.push({
        id: `skill:${g.id}:${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        text: `${s.name} — ${s.note}`,
        sourceId: g.id,
        sourceLabel: g.label,
        sourceKind: 'skill',
        tags: [s.name],
      })
    }
  }

  return out
}

/** Every distinct technology mentioned anywhere, for the matcher's lexicon. */
export function buildLexicon(): string[] {
  const set = new Set<string>()
  roles.forEach((r) => r.stack.forEach((s) => set.add(s)))
  projects.forEach((p) => p.stack.forEach((s) => set.add(s)))
  skillGroups.forEach((g) => g.items.forEach((s) => set.add(s.name)))
  return [...set].sort()
}

/**
 * Natural-language corpus used to TRAIN the next-word model.
 * It is deliberately the same prose the site displays, so the model
 * speaks in the register the visitor is already reading.
 */
export function buildWritingCorpus(): string[] {
  const out: string[] = []
  out.push(profile.intro, ...profile.about, profile.headline)
  roles.forEach((r) => { out.push(r.summary); out.push(...r.bullets) })
  projects.forEach((p) => { out.push(p.blurb, p.narrative); out.push(...p.highlights) })
  skillGroups.forEach((g) => g.items.forEach((s) => { if (s.note) out.push(s.note) }))
  return out
}
