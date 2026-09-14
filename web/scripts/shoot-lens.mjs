import { chromium } from 'playwright'
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--disable-features=OptimizationHints,Translate,MediaRouter,AutofillServerCommunication'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', e => errs.push(e.message))
page.on('console', m => m.type()==='error' && errs.push(m.text()))
await page.goto('http://127.0.0.1:3200/lens', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
await page.getByText('Try a sample posting').click()
await page.waitForTimeout(2200)
await page.screenshot({ path: '/home/claude/shots/lens.png' })
// expand the first requirement to check evidence rendering
await page.locator('li button').first().click()
await page.waitForTimeout(900)
await page.evaluate(() => window.scrollTo(0, 1150))
await page.waitForTimeout(700)
await page.screenshot({ path: '/home/claude/shots/lens-detail.png' })
console.log('errors:', errs.length ? errs.slice(0,4) : 'none')
await browser.close()
