import { chromium } from 'playwright'
const out = process.env.OUT_DIR
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1700, height: 940 }, deviceScaleFactor: 2 })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
await page.click('.debug__toggle')

// Tap the centre screen; the camera should come to it.
// The panels live in a CSS3D-transformed container that drei rewrites every
// frame, so Playwright's stability check never settles. Dispatch directly.
const clickByLabel = (label) =>
  page.evaluate((l) => document.querySelector(`button[aria-label="${l}"]`)?.click(), label)
await clickByLabel('Focus the centre touchscreen')
await page.waitForTimeout(1600)
await page.screenshot({ path: `${out}/focus-01-screen.png` })

// The head unit should now be live: switch to Media.
await page.evaluate(() => document.querySelectorAll('.dock__item')[1].click())
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/focus-02-media.png` })

// Escape returns to the cabin.
await page.keyboard.press('Escape')
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/focus-03-back.png` })

// And the cluster.
await clickByLabel('Focus the instrument cluster')
await page.waitForTimeout(1600)
await page.screenshot({ path: `${out}/focus-04-cluster.png` })

console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 6).join('\n') : 'no console errors')
await browser.close()
