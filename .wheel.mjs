import { chromium } from 'playwright'
const out = process.env.OUT_DIR
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1700, height: 940 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
const k = (key, type='keydown') => page.evaluate(([a,b]) => window.dispatchEvent(new KeyboardEvent(b,{key:a})), [key,type])
await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
await page.click('.debug__toggle'); await page.waitForTimeout(800)

// Get moving so cruise can engage.
await page.evaluate(() => window.__forceRunning?.())
for (const key of ['.', '.', '.']) await k(key)
await k('w')
await page.waitForTimeout(7000)
await k('w','keyup')
await page.screenshot({ path: `${out}/wheel-00-driving.png` })

// Click the wheel hub to zoom in. Raycast target: aim at the hub on screen.
// The Ford oval sits at roughly (544, 544) in this viewport.
await page.mouse.click(544, 544)
await page.waitForTimeout(1900)
await page.screenshot({ path: `${out}/wheel-01-focus.png` })
console.log('focused:', await page.evaluate(() => !!document.querySelector('.focusbar[data-open]')))
console.log('label:', await page.evaluate(() => document.querySelector('.focusbar__label')?.textContent))

// Press SET+ a few times and watch the cluster answer.
const before = await page.evaluate(() => document.querySelector('.speed__value')?.textContent)
for (let i = 0; i < 3; i++) { await page.mouse.click(700, 470); await page.waitForTimeout(220) }
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/wheel-02-pressed.png` })
console.log('speed before/after:', before, await page.evaluate(() => document.querySelector('.speed__value')?.textContent))
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0,6).join('\n') : 'no console errors')
await browser.close()
