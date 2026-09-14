export type Evidence = {
  /** stable id, used as the vector key */
  id: string
  /** the sentence that gets embedded */
  text: string
  /** where this claim comes from */
  sourceId: string
  sourceLabel: string
  sourceKind: 'role' | 'project' | 'education' | 'skill'
  /** technologies / concepts this evidence demonstrates */
  tags: string[]
}

export type Role = {
  id: string
  company: string
  title: string
  location: string
  start: string
  end: string
  kind: 'coop' | 'placement' | 'part-time'
  summary: string
  bullets: string[]
  stack: string[]
}

export type Project = {
  id: string
  name: string
  tagline: string
  year: string
  status: 'live' | 'active' | 'archived' | 'academic'
  kind: 'product' | 'tool' | 'ml' | 'academic'
  blurb: string
  narrative: string
  highlights: string[]
  stack: string[]
  metrics?: { label: string; value: string }[]
  links?: { label: string; href: string }[]
}

export type SkillGroup = {
  id: string
  label: string
  items: { name: string; level: 1 | 2 | 3; note?: string }[]
}
