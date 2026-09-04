import { chromium } from 'playwright'
const out = process.env.OUT || '/tmp/look.png'
const w = Number(process.env.W || 1700), h = Number(process.env.H || 940)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await page.goto(process.env.URL || 'http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(process.env.WAIT || 2600))
if (process.env.SCRIPT) await page.evaluate(process.env.SCRIPT)
await page.waitForTimeout(Number(process.env.WAIT2 || 900))
await page.screenshot({ path: out })
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no console errors')
await browser.close()
