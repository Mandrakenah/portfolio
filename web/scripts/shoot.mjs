import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:3000'
const targets = process.argv.slice(2)
if (!targets.length) targets.push('/:home')

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: [
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--no-first-run',
    '--disable-features=OptimizationHints,Translate,MediaRouter,AutofillServerCommunication',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  ],
})
for (const t of targets) {
  const [path, name, mode] = t.split(':')
  const mobile = mode === 'm'
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForLoadState('load').catch(() => {})
  if (mode === 'full') {
    // walk the page so scroll-triggered reveals actually fire
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 220))
      }
      window.scrollTo(0, 0)
      await new Promise((r) => setTimeout(r, 400))
    })
  }
  await page.waitForTimeout(2200)
  const file = `/home/claude/shots/${name}${mobile ? '-mobile' : ''}.png`
  await page.screenshot({ path: file, fullPage: mode === 'full' })
  console.log(`✓ ${path} → ${file}${errors.length ? `  ⚠ ${errors.length} console errors` : ''}`)
  errors.slice(0, 5).forEach((e) => console.log('    ' + e.slice(0, 160)))
  await ctx.close()
}
await browser.close()
