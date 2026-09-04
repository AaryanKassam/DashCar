import { chromium } from 'playwright'
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal'] })
const page = await browser.newPage({ viewport: { width: 1700, height: 940 } })
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto('http://localhost:5177/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
const info = await page.evaluate(() => ({
  shields: [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label')||'').startsWith('Focus')).map(b => b.getAttribute('aria-label')),
  iviParent: document.querySelector('.ivi')?.parentElement?.outerHTML?.slice(0, 260),
  ivi: !!document.querySelector('.ivi'),
  cluster: !!document.querySelector('.cluster'),
}))
console.log(JSON.stringify(info, null, 1))
await browser.close()
