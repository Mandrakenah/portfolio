import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication'],
})
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))

// baseline order
await page.goto('http://127.0.0.1:3200/work', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
const before = await page.locator('main ul li h3').allTextContents()
console.log('BEFORE:', before.map(t => t.replace(/\s+/g,' ').trim()).join(' | '))

// run the lens on an ML-heavy posting
await page.goto('http://127.0.0.1:3200/lens', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
await page.locator('textarea').fill(`Machine Learning Engineer Intern
- Train and evaluate models with scikit-learn and pandas
- Build data pipelines on AWS for model training
- Evaluate models using AUC on imbalanced datasets
- Apply feature normalisation and early stopping when training neural networks`)
await page.getByText('Analyse posting').click()
await page.waitForTimeout(1800)

// order after
await page.goto('http://127.0.0.1:3200/work', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)
const after = await page.locator('main ul li h3').allTextContents()
console.log('AFTER :', after.map(t => t.replace(/\s+/g,' ').trim()).join(' | '))
const banner = await page.locator('text=Reordered for').count()
console.log('banner present:', banner > 0)
console.log('order changed :', JSON.stringify(before) !== JSON.stringify(after))
console.log('errors:', errs.length ? errs : 'none')
await b.close()
