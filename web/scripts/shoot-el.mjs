import { chromium } from 'playwright'
const [url, selector, out, waitMs] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run',
         '--disable-features=OptimizationHints,Translate,MediaRouter,AutofillServerCommunication',
         '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
page.on('console', m => m.type() === 'error' && errs.push(m.text()))
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(Number(waitMs || 4000))
const el = page.locator(selector).first()
await el.scrollIntoViewIfNeeded()
await page.waitForTimeout(2500)
await el.screenshot({ path: out })
console.log('saved', out, '| errors:', errs.length ? errs.slice(0,3) : 'none')
await browser.close()
