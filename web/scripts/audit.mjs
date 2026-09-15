import { chromium } from 'playwright'

const PAGES = ['/', '/work', '/work/flowtrace', '/lab', '/lens', '/system']
const BASE = process.env.BASE || 'http://127.0.0.1:3200'

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication',
         '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})

const AUDIT = () => {
  // ── WCAG relative luminance + contrast ratio ──
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const parse = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
    return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null
  }
  const over = (fg, bg) => fg.a >= 1 ? fg.rgb : fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a))
  // walk up for the first opaque background
  const bgOf = (el) => {
    let n = el
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c.a > 0.85) return c.rgb
      n = n.parentElement
    }
    return parse(getComputedStyle(document.body).backgroundColor)?.rgb ?? [0, 0, 0]
  }

  const contrast = [], small = [], targets = [], misc = []
  const seenPairs = new Set()

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) continue

    // direct text only
    const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
    const fs = parseFloat(cs.fontSize)
    const fw = parseInt(cs.fontWeight) || 400

    if (text.length > 1) {
      const fg = parse(cs.color)
      if (fg) {
        const bg = bgOf(el)
        const r = ratio(over(fg, bg), bg)
        const large = fs >= 24 || (fs >= 18.66 && fw >= 700)
        const need = large ? 3 : 4.5
        const key = `${cs.color}|${bg.join(',')}|${Math.round(fs)}`
        if (r < need && !seenPairs.has(key)) {
          seenPairs.add(key)
          contrast.push({ ratio: +r.toFixed(2), need, fs: +fs.toFixed(1), fw,
            color: cs.color, bg: `rgb(${bg.map(Math.round).join(',')})`,
            sample: text.slice(0, 58), tag: el.tagName.toLowerCase() })
        }
      }
      if (fs < 12 && text.length > 12) {
        small.push({ fs: +fs.toFixed(1), sample: text.slice(0, 52), tag: el.tagName.toLowerCase() })
      }
    }

    // touch targets
    if (/^(a|button)$/i.test(el.tagName) && el.offsetParent !== null) {
      const label = (el.textContent || el.getAttribute('aria-label') || '').trim()
      if (label && (rect.height < 32 || rect.width < 32)) {
        targets.push({ w: Math.round(rect.width), h: Math.round(rect.height), label: label.slice(0, 40) })
      }
    }
  }

  // focus visibility on the first few interactive elements
  const focusables = [...document.querySelectorAll('a[href],button,input,textarea')].slice(0, 6)
  let noFocusRing = 0
  for (const el of focusables) {
    el.focus()
    const cs = getComputedStyle(el)
    const hasOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
    const hasRing = cs.boxShadow !== 'none'
    if (!hasOutline && !hasRing) noFocusRing++
  }
  if (noFocusRing) misc.push(`${noFocusRing}/${focusables.length} interactive elements show no visible focus indicator when tabbed to`)

  if (!document.querySelector('a[href^="#"],a[href*="skip"]')) misc.push('no skip-to-content link')
  const h1 = document.querySelectorAll('h1').length
  if (h1 !== 1) misc.push(`${h1} <h1> elements`)

  // heading order
  const hs = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1])
  for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i-1] > 1) { misc.push(`heading level jumps h${hs[i-1]} → h${hs[i]}`); break }

  return { contrast, small: small.slice(0, 8), targets: targets.slice(0, 8), misc }
}

for (const path of PAGES) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  const r = await page.evaluate(AUDIT)
  console.log(`\n${'═'.repeat(70)}\n${path}`)
  if (r.contrast.length) {
    console.log('  CONTRAST FAILURES (WCAG AA):')
    r.contrast.sort((a,b2)=>a.ratio-b2.ratio).slice(0, 10).forEach(c =>
      console.log(`    ${String(c.ratio).padStart(5)}:1 (needs ${c.need})  ${c.fs}px  ${c.color} on ${c.bg}\n            "${c.sample}"`))
  } else console.log('  contrast: all pass')
  if (r.small.length) { console.log('  TEXT UNDER 12px:'); r.small.forEach(s => console.log(`    ${s.fs}px  "${s.sample}"`)) }
  if (r.targets.length) { console.log('  SMALL TAP TARGETS (<32px):'); r.targets.forEach(t => console.log(`    ${t.w}x${t.h}  "${t.label}"`)) }
  if (r.misc.length) { console.log('  OTHER:'); r.misc.forEach(m => console.log('    - ' + m)) }
  await ctx.close()
}
await b.close()
