import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication'],
})
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } })
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:3200/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
// walk down so scroll reveals fire, capturing named sections
const stops = [['about', 1000], ['work', 2500], ['experience', 3900], ['skills', 5300], ['footer', 6900]]
for (const [name, y] of stops) {
  await page.evaluate(async (target) => {
    const step = 400
    for (let cur = window.scrollY; cur < target; cur += step) {
      window.scrollTo(0, cur); await new Promise(r => setTimeout(r, 90))
    }
    window.scrollTo(0, target)
  }, y)
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `/home/claude/shots/sec-${name}.png` })
  console.log('✓', name)
}
await b.close()
