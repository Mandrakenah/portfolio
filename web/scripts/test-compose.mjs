import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication'] })
const page = await (await b.newContext({ viewport:{width:1280,height:900} })).newPage()
const errs=[]; page.on('pageerror',e=>errs.push(e.message))
await page.goto('http://127.0.0.1:3200/lab',{waitUntil:'domcontentloaded'})
await page.waitForTimeout(2000)
const ta = page.locator('textarea').first()
await ta.click()
await page.waitForTimeout(6000)                       // model download
await ta.type('I would like to', { delay: 25 })
await page.waitForTimeout(900)
const ghost = await page.evaluate(() => {
  const spans=[...document.querySelectorAll('[aria-hidden] span')]
  return spans.map(s=>`[${getComputedStyle(s).color}] ${JSON.stringify(s.textContent)}`).join('\n   ')
})
console.log('mirror spans:\n  ', ghost)
// accept with Tab
await page.keyboard.press('Tab')
await page.waitForTimeout(500)
console.log('after Tab, textarea =', JSON.stringify(await ta.inputValue()))
console.log('errors:', errs.length? errs.slice(0,3):'none')
await b.close()
