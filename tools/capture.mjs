/**
 * Screenshot capture for the README and for eyeballing changes.
 *
 * Building a 3D cabin without looking at it is guesswork, and most of the real
 * bugs in this project were invisible in the code and obvious in a render: the
 * road sliding out from under the camera, a steering wheel buried inside the
 * dashboard, a focus pose aimed 180° away from the panel it was meant to frame,
 * a vehicle package that gave the body a two-metre hood.
 *
 *   npm run build && npm run preview        # in one terminal
 *   node tools/capture.mjs docs             # hero shots into docs/
 *   node tools/capture.mjs panels <outDir>  # each display at 1:1
 *   node tools/capture.mjs camera <outDir>  # pan, clamp, zoom, focus
 *   node tools/capture.mjs trims  <outDir>  # every trim in the cabin
 *
 * It drives the app through real key and pointer events rather than reaching
 * into the store, so a capture that succeeds is also a smoke test. Any console
 * error fails the run.
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
  page.evaluate(([a, b]) => window.dispatchEvent(new KeyboardEvent(b, { key: a })), [k, type])

/**
 * The displays live in a CSS3D-transformed container that drei rewrites every
 * frame, so Playwright's actionability check never settles on them. Dispatch
 * the click directly.
 */
const clickIn3D = (page, selector) =>
  page.evaluate((s) => document.querySelector(s)?.click(), selector)

/** Ignition on, into Drive, foot down. */
async function pullAway(page) {
  await page.evaluate(() => window.__forceRunning?.())
  for (const k of ['.', '.', '.']) await key(page, k)
  await key(page, 'w')
}

/**
 * Pick an interior colourway from the bench panel.
 *
 * This replaced a trim dropdown that no longer exists. The five trims differed
 * only in colour, so the control was removed in favour of the one that changes
 * something visible; the capture follows the app rather than the other way round.
 */
const pickInterior = async (page, name) => {
  await page.evaluate((n) => {
    const cards = [...document.querySelectorAll('.debug__swatch')]
    const match = cards.find((c) =>
      c.querySelector('.debug__swatch-label')?.textContent?.trim().startsWith(n))
    ;(match ?? cards[0]).click()
  }, name)
  await page.waitForTimeout(1400)
}

async function captureDocs() {
  const page = await newPage(1700, 940)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.click('.debug__toggle')
  // The panel slides out over 320ms; screenshotting mid-transition catches it
  // halfway across the frame.
  await page.waitForTimeout(800)

  await page.screenshot({ path: `${OUT}/interior-default.png` })

  // Exterior turntable.
  await page.evaluate(() =>
    [...document.querySelectorAll('.viewtoggle__segment')].find((b) => b.textContent === 'Exterior').click(),
  )
  await page.waitForTimeout(2400)
  await page.screenshot({ path: `${OUT}/exterior-turntable.png` })
  await page.evaluate(() =>
    [...document.querySelectorAll('.viewtoggle__segment')].find((b) => b.textContent === 'Interior').click(),
  )
  await page.waitForTimeout(1800)

  // Focused centre screen.
  await clickIn3D(page, 'button[aria-label="Focus the centre touchscreen"]')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${OUT}/infotainment-focus.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)

  // Night drive on the ST Red Accent interior, where the red ambient lives.
  await pullAway(page)
  await page.waitForTimeout(5200)
  await key(page, 't')
  await key(page, 't')
  await key(page, 'l')
  await page.waitForTimeout(2600)
  await pickInterior(page, 'ST Red Accent')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${OUT}/night-st.png` })

  // Bench panel with faults injected.
  await key(page, 'w', 'keyup')
  await key(page, 's')
  await page.waitForTimeout(5000)
  await key(page, 's', 'keyup')
  await key(page, 't')
  await pickInterior(page, 'Ebony / Medium Grey')
  await page.click('.debug__toggle')
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    const chips = document.querySelectorAll('.debug__chip')
    chips[0].click()
    chips[4].click()
  })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/bench-panel.png` })
}

async function capturePanels() {
  const page = await newPage(1300, 900)
  await page.goto(`${BASE}/#panels`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const ivi = page.locator('.ivi')

  await page.locator('.cluster').screenshot({ path: `${OUT}/panel-cluster.png` })
  // Rail order matches APPS in the registry.
  const apps = ['home', 'navigation', 'audio', 'phone', 'messages', 'climate', 'vehicle', 'settings']
  for (const [i, name] of apps.entries()) {
    await page.locator('.rail__item').nth(i).click()
    await page.waitForTimeout(900)
    await ivi.screenshot({ path: `${OUT}/app-${name}.png` })
  }

  // The sound pane, which is where the audio processing is actually exposed.
  await page.locator('.rail__item').nth(2).click()
  await page.waitForTimeout(400)
  await page.evaluate(() =>
    [...document.querySelectorAll('.audio__tabs .chip')].find((b) => b.textContent === 'Sound').click())
  await page.waitForTimeout(800)
  await ivi.screenshot({ path: `${OUT}/app-sound.png` })

  await page.evaluate(() => window.__toggleSurround?.())
  await page.waitForTimeout(4000)
  await ivi.screenshot({ path: `${OUT}/app-surround.png` })
}

/**
 * Exercises the rig: both yaw clamps, both pitch clamps, full zoom, and both
 * focus poses. Every one of these has been wrong at some point.
 */
async function captureCamera() {
  const page = await newPage(1700, 940)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.click('.debug__toggle')
  await page.waitForTimeout(800)

  const cx = 850
  const cy = 470
  const drag = async (dx, dy, steps = 24) => {
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    for (let i = 1; i <= steps; i++) await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps)
    await page.mouse.up()
  }

  await page.screenshot({ path: `${OUT}/cam-default.png` })

  await drag(900, 0)
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/cam-yaw-a.png` })
  await drag(-1800, 0)
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/cam-yaw-b.png` })

  await page.mouse.dblclick(cx, cy)
  await page.waitForTimeout(900)
  await drag(0, -500)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/cam-pitch-a.png` })
  await drag(0, 1000)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/cam-pitch-b.png` })

  await page.mouse.dblclick(cx, cy)
  await page.waitForTimeout(900)
  await page.mouse.move(cx, cy)
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, -60)
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/cam-zoom.png` })

  await page.mouse.dblclick(cx, cy)
  await page.waitForTimeout(900)
  await clickIn3D(page, 'button[aria-label="Focus the centre touchscreen"]')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${OUT}/cam-focus-screen.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)
  await clickIn3D(page, 'button[aria-label="Focus the instrument cluster"]')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${OUT}/cam-focus-cluster.png` })
}

async function captureInteriors() {
  const page = await newPage(1700, 940)
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.click('.debug__toggle')

  const names = await page.evaluate(() =>
    [...document.querySelectorAll('.debug__swatch-label')].map((n) => n.textContent.trim()))

  for (const [i, name] of names.entries()) {
    await pickInterior(page, name)
    await page.screenshot({ path: `${OUT}/interior-${i + 1}.png` })
  }
}

const modes = { docs: captureDocs, panels: capturePanels, camera: captureCamera, interiors: captureInteriors }
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
