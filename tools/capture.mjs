/**
 * Screenshot capture for the README and for eyeballing changes.
 *
 * Building a 3D cockpit without looking at it is guesswork, and several of the
 * bugs this project hit — the road sliding out from under the camera, a
 * steering wheel buried inside the dashboard, a gauge inheriting the previous
 * car's accent colour — were invisible in the code and obvious in a render.
 *
 *   npm run build && npm run preview        # in one terminal
 *   node tools/capture.mjs docs             # hero shots into docs/
 *   node tools/capture.mjs panels <outDir>  # each head-unit app at 1:1
 *   node tools/capture.mjs cars <outDir>    # every car in the garage
 *
 * It drives the app through real key and pointer events rather than reaching
 * into the store, so a capture that succeeds is also a smoke test.
 */
import { chromium } from 'playwright'

const MODE = process.argv[2] ?? 'docs'
const OUT = process.argv[3] ?? 'docs'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173'

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const errors = []

async function newPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return page
}

const key = (page, k, type = 'keydown') =>
  page.evaluate(([k, type]) => window.dispatchEvent(new KeyboardEvent(type, { key: k })), [k, type])

/** Ignition on, into Drive, foot down. */
async function pullAway(page) {
  await page.evaluate(() => window.__forceRunning?.())
  for (const k of ['.', '.', '.']) await key(page, k)
  await key(page, 'w')
}

async function captureDocs() {
  const page = await newPage(1600, 900)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.click('.debug__toggle')

  await pullAway(page)
  await page.waitForTimeout(6500)
  await page.screenshot({ path: `${OUT}/cockpit-day.png` })

  await key(page, 't')
  await key(page, 't')
  await key(page, 'l')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/cockpit-night.png` })

  // Slow into the surround-view speed window before opening it.
  await key(page, 'w', 'keyup')
  await key(page, 's')
  await page.waitForTimeout(6000)
  await key(page, 's', 'keyup')
  await key(page, 't')
  await key(page, 'v')
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/surround-view.png` })

  await key(page, 'v')
  await page.click('.debug__toggle')
  await page.waitForTimeout(600)
  const chips = await page.$$('.debug__chip')
  await chips[0].click()
  await chips[4].click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/bench-panel.png` })
}

async function capturePanels() {
  const page = await newPage(1260, 820)
  await page.goto(`${BASE}/#panels`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  const ivi = page.locator('.ivi')

  await page.locator('.cluster').screenshot({ path: `${OUT}/panel-cluster.png` })
  for (const [i, name] of ['map', 'media', 'messages', 'climate'].entries()) {
    await page.locator('.dock__item').nth(i).click()
    await page.waitForTimeout(900)
    await ivi.screenshot({ path: `${OUT}/app-${name}.png` })
  }

  await page.evaluate(() => window.__toggleSurround?.())
  await page.waitForTimeout(4000)
  await ivi.screenshot({ path: `${OUT}/app-surround.png` })
}

async function captureCars() {
  const page = await newPage(1500, 860)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const cars = await page.$$('.debug__car')
  for (let i = 0; i < cars.length; i++) {
    await page.locator('.debug__car').nth(i).click()
    await page.waitForTimeout(700)
    await pullAway(page)
    await page.waitForTimeout(5000)
    await page.click('.debug__toggle')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/car-${i + 1}.png` })
    await page.click('.debug__toggle')
    await key(page, 'w', 'keyup')
    await key(page, 's')
    await page.waitForTimeout(4000)
    await key(page, 's', 'keyup')
  }
}

const modes = { docs: captureDocs, panels: capturePanels, cars: captureCars }
const run = modes[MODE]
if (!run) {
  console.error(`Unknown mode "${MODE}". Expected one of: ${Object.keys(modes).join(', ')}`)
  process.exit(1)
}

await run()
await browser.close()

if (errors.length) {
  console.error(`Captured with ${errors.length} console error(s):\n  ${errors.slice(0, 10).join('\n  ')}`)
  process.exit(1)
}
console.log(`Captured "${MODE}" into ${OUT}/ with no console errors.`)
