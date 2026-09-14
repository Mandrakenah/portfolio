import { chromium } from 'playwright'

const PAGES = ['/', '/work', '/work/flowtrace', '/work/this-site', '/lab', '/lens', '/system']
const BASE = 'http://127.0.0.1:3200'
let fail = 0

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication',
         '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})

for (const path of PAGES) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errs = [], notFound = []
  page.on('pageerror', e => errs.push(e.message))
  page.on('console', m => m.type() === 'error' && errs.push(m.text()))
  page.on('response', r => { if (r.status() === 404) notFound.push(new URL(r.url()).pathname) })

  const res = await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)

  const audit = await page.evaluate(() => {
    const out = {}
    out.title = document.title
    out.h1 = document.querySelectorAll('h1').length
    out.lang = document.documentElement.lang
    out.imgsNoAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length
    out.btnsNoName = [...document.querySelectorAll('button')].filter(
      el => !el.textContent.trim() && !el.getAttribute('aria-label')).length
    out.linksNoName = [...document.querySelectorAll('a')].filter(
      el => !el.textContent.trim() && !el.getAttribute('aria-label')).length
    out.inputsNoLabel = [...document.querySelectorAll('input,textarea')].filter(
      el => !el.getAttribute('aria-label') && !el.getAttribute('placeholder') &&
            !document.querySelector(`label[for="${el.id}"]`)).length
    // horizontal overflow is the classic mobile killer
    out.overflowX = document.documentElement.scrollWidth > window.innerWidth + 1
    return out
  })

  const problems = []
  if (res.status() !== 200) problems.push(`status ${res.status()}`)
  if (audit.h1 !== 1) problems.push(`${audit.h1} h1 elements`)
  if (!audit.lang) problems.push('no lang attribute')
  if (audit.imgsNoAlt) problems.push(`${audit.imgsNoAlt} img without alt`)
  if (audit.btnsNoName) problems.push(`${audit.btnsNoName} unnamed buttons`)
  if (audit.linksNoName) problems.push(`${audit.linksNoName} unnamed links`)
  if (audit.inputsNoLabel) problems.push(`${audit.inputsNoLabel} unlabelled inputs`)
  if (audit.overflowX) problems.push('horizontal overflow')
  if (errs.length) problems.push(`${errs.length} console errors: ${errs[0]?.slice(0,90)}`)
  if (notFound.length) problems.push(`404s: ${[...new Set(notFound)].join(', ')}`)

  if (problems.length) { fail++; console.log(`✗ ${path.padEnd(20)} ${problems.join(' · ')}`) }
  else console.log(`✓ ${path.padEnd(20)} clean  "${audit.title.slice(0, 46)}"`)
  await ctx.close()
}

// mobile overflow sweep
console.log('\n── mobile (390px) ──')
for (const path of PAGES) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const o = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    widest: document.documentElement.scrollWidth,
  }))
  if (o.overflow) { fail++; console.log(`✗ ${path.padEnd(20)} overflows to ${o.widest}px`) }
  else console.log(`✓ ${path.padEnd(20)} no overflow`)
  await ctx.close()
}

await b.close()
console.log(fail ? `\n${fail} issue(s)` : '\nall checks passed')
