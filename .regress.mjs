import { chromium } from 'playwright'
const out = process.env.OUT_DIR
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1700, height: 940 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
const k = (key, type = 'keydown') => page.evaluate(([key, type]) => window.dispatchEvent(new KeyboardEvent(type, { key })), [key, type])

await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.click('.debug__toggle')

// --- driving ---
await page.evaluate(() => window.__forceRunning?.())
for (const g of ['.', '.', '.']) await k(g)
await k('w')
await page.waitForTimeout(7000)
await page.screenshot({ path: `${out}/reg-01-driving.png` })
const speed = await page.evaluate(() => document.querySelector('.speed__value')?.textContent)
const strip = await page.evaluate(() => [...document.querySelectorAll('.strip__signal')].map(e => e.textContent).join(' | '))
console.log('strip: ' + strip)

// --- night ---
await k('t'); await k('t'); await k('l')
await page.waitForTimeout(3000)
await page.screenshot({ path: `${out}/reg-02-night.png` })

// --- ST trim, for the red ambient ---
await page.evaluate(() => document.querySelector('.trim__trigger').click())
await page.waitForTimeout(400)
await page.evaluate(() => [...document.querySelectorAll('.trim__option')].find(b => b.textContent.includes('ST ') || b.textContent.startsWith('Explorer® ST')).click())
await page.waitForTimeout(2200)
await page.screenshot({ path: `${out}/reg-03-st-night.png` })

// --- slow down, surround view ---
await k('w', 'keyup'); await k('s')
await page.waitForTimeout(6500)
await k('s', 'keyup'); await k('t'); await k('v')
await page.waitForTimeout(3500)
await page.screenshot({ path: `${out}/reg-04-surround.png` })

console.log('speed reached: ' + speed)
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no console errors')
await browser.close()
