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

const cx = 850, cy = 470
async function drag(dx, dy, steps = 24) {
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps)
  await page.mouse.up()
}

await page.screenshot({ path: `${out}/cam-00-default.png` })

// Pan hard left; the clamp should stop it softly at the driver's door card.
await drag(900, 0)
await page.waitForTimeout(1400)
await page.screenshot({ path: `${out}/cam-01-yaw-left.png` })

await drag(-1800, 0)
await page.waitForTimeout(1400)
await page.screenshot({ path: `${out}/cam-02-yaw-right.png` })

// Recentre, then pitch down to the console and up to the headliner.
await page.mouse.dblclick(cx, cy)
await page.waitForTimeout(900)
await drag(0, -500)
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/cam-03-pitch-down.png` })
await drag(0, 1000)
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/cam-04-pitch-up.png` })

// Recentre and zoom in with the wheel.
await page.mouse.dblclick(cx, cy)
await page.waitForTimeout(900)
await page.mouse.move(cx, cy)
for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -60); await page.waitForTimeout(16) }
await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/cam-05-zoomed.png` })

console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 6).join('\n') : 'no console errors')
await browser.close()
