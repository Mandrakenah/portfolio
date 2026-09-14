import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication'],
})
const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
await page.goto('http://127.0.0.1:3200/lab', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
const chips = await page.locator('button:has-text("…")').allTextContents()
let fail = 0
for (const c of chips) {
  await page.locator(`button:text-is("${c}")`).click()
  await page.waitForTimeout(700)
  const empty = await page.locator('text=no continuation for that context').count()
  const rows = await page.locator('button[title]').count()
  if (empty || rows === 0) { fail++; console.log(`✗ ${c} → NO PREDICTIONS`) }
  else console.log(`✓ ${c} → ${rows} predictions`)
}
console.log(fail ? `\n${fail} broken seed(s)` : '\nall seeds predict')
await b.close()
