import { chromium } from 'playwright'
const out = process.env.OUT || '/tmp/look.png'
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: Number(process.env.W||2000), height: Number(process.env.H||840) }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
await page.click('.debug__toggle'); await page.waitForTimeout(800)
if (process.env.SCRIPT) { await page.evaluate(process.env.SCRIPT); await page.waitForTimeout(Number(process.env.WAIT2||1200)) }
await page.screenshot({ path: out })
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0,6).join('\n') : 'no console errors')
await browser.close()
