import { chromium } from 'playwright'
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--disable-background-networking','--disable-features=OptimizationHints,Translate,AutofillServerCommunication',
         '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const kb = n => (n / 1024).toFixed(0).padStart(4) + ' KB'
for (const path of ['/', '/work', '/lens', '/lab', '/system']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:3200' + path, { waitUntil: 'load' })
  await page.waitForTimeout(3500)
  const r = await page.evaluate(() => {
    const e = performance.getEntriesByType('resource')
    const sum = f => e.filter(f).reduce((a, x) => a + (x.transferSize || 0), 0)
    const nav = performance.getEntriesByType('navigation')[0]
    const big = e.slice().sort((a, b2) => (b2.transferSize || 0) - (a.transferSize || 0))[0]
    return {
      doc: nav?.transferSize || 0,
      js: sum(x => x.name.endsWith('.js')),
      font: sum(x => /\.woff2?$/.test(x.name)),
      json: sum(x => x.name.endsWith('.json')),
      css: sum(x => x.name.endsWith('.css')),
      total: (nav?.transferSize || 0) + sum(() => true),
      big: [big?.name.split('/').pop()?.slice(0, 34), big?.transferSize || 0],
    }
  })
  console.log(`${path.padEnd(9)} doc${kb(r.doc)} · js${kb(r.js)} · css${kb(r.css)} · font${kb(r.font)} · models${kb(r.json)} → total${kb(r.total)}`)
  await ctx.close()
}
await b.close()
