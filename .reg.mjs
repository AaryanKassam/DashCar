import { chromium } from 'playwright'
const out = process.env.OUT_DIR
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1700, height: 940 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
const k = (key, type = 'keydown') => page.evaluate(([a, b]) => window.dispatchEvent(new KeyboardEvent(b, { key: a })), [key, type])

await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2400)
await page.click('.debug__toggle')

// --- trim dropdown ---
await page.click('.trim__trigger')
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/reg-01-trim-open.png` })
await page.evaluate(() => [...document.querySelectorAll('.trim__option')].find(b => b.textContent.includes('ST-Line')).click())
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/reg-02-stline.png` })

// back to Active
await page.click('.trim__trigger')
await page.waitForTimeout(400)
await page.evaluate(() => [...document.querySelectorAll('.trim__option')].find(b => b.textContent.includes('Active')).click())
await page.waitForTimeout(900)

// --- driving ---
await page.evaluate(() => window.__forceRunning?.())
for (const key of ['.', '.', '.']) await k(key)
await k('w')
await page.waitForTimeout(7000)
await page.screenshot({ path: `${out}/reg-03-driving.png` })
const speed = await page.evaluate(() => document.querySelector('.speed__value')?.textContent)

// --- steering while driving ---
await k('a')
await page.waitForTimeout(2200)
await page.screenshot({ path: `${out}/reg-04-steering.png` })
await k('a', 'keyup')

// --- night ---
await k('t'); await k('t'); await k('l')
await page.waitForTimeout(3000)
await page.screenshot({ path: `${out}/reg-05-night.png` })

// --- slow down and open surround view ---
await k('w', 'keyup'); await k('s')
await page.waitForTimeout(6500)
await k('s', 'keyup'); await k('t'); await k('v')
await page.waitForTimeout(3000)
await page.screenshot({ path: `${out}/reg-06-surround.png` })

console.log('speed reached:', speed)
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no console errors')
await browser.close()
