'use client'

/**
 * Adaptive ordering.
 *
 * When a visitor runs a job posting through the Recruiter Lens, we learn what
 * they came to find out. That signal is worth more than my own opinion about
 * which project should sit at the top of the list, so the site re-ranks itself
 * around it. The intent stays in sessionStorage: it is never sent anywhere,
 * and it disappears when the tab closes.
 */

export type Intent = {
  /** short human label, e.g. "Software Developer Intern" */
  label: string
  /** project ids, most relevant first */
  ranking: string[]
  /** technologies the posting asked for that I can evidence */
  matched: string[]
  at: number
}

const KEY = 'arjun.intent.v1'

export function saveIntent(i: Intent) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(i))
    window.dispatchEvent(new CustomEvent('intent:change'))
  } catch {
    /* private mode — adaptive ordering just stays off */
  }
}

export function readIntent(): Intent | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const i = JSON.parse(raw) as Intent
    return Date.now() - i.at < 1000 * 60 * 60 * 6 ? i : null
  } catch {
    return null
  }
}

export function clearIntent() {
  try {
    sessionStorage.removeItem(KEY)
    window.dispatchEvent(new CustomEvent('intent:change'))
  } catch {
    /* nothing to clear */
  }
}

/** Pull a plausible role name out of the posting for the banner. */
export function guessRoleTitle(jd: string): string {
  for (const line of jd.split(/\r?\n/).slice(0, 6)) {
    const t = line.trim().replace(/[—–-].*$/, '').trim()
    if (t.length >= 6 && t.length <= 60 && /[A-Za-z]/.test(t) && !/:$/.test(t)) return t
  }
  return 'the role you pasted'
}
