// Checks the panel fits inside the visible screen on several device sizes and screenshots each.
// Usage: node tools/check-fit.mjs <outDir>
import { chromium, devices } from 'playwright'
const out = process.argv[2]
const cases = [
  ['redmi-urlbar', { width: 393, height: 735 }, true],
  ['redmi-full', { width: 393, height: 851 }, true],
  ['small-phone', { width: 360, height: 640 }, true],
  ['landscape', { width: 851, height: 393 }, true],
  ['laptop', { width: 1440, height: 820 }, false],
]
const b = await chromium.launch()
for (const [name, viewport, mobile] of cases) {
  const ctx = await b.newContext({ ...(mobile ? devices['Pixel 7'] : {}), viewport, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto('http://localhost:5173/')
  await p.waitForFunction(() => !document.querySelector('.tap')?.disabled)
  await p.click('.tap')
  await p.waitForTimeout(700)
  const r = await p.evaluate(() => {
    const f = document.querySelector('.frame').getBoundingClientRect()
    const d = document.querySelector('.dock')?.getBoundingClientRect()
    const ph = document.querySelector('.phone').getBoundingClientRect()
    return { frame: [Math.round(f.left), Math.round(f.top), Math.round(f.right), Math.round(f.bottom)], dockBottom: Math.round(d?.bottom ?? -1), phoneVsFrame: [Math.round(ph.width), Math.round(f.width)], vh: innerHeight, vw: innerWidth, scrollH: document.documentElement.scrollHeight }
  })
  const ok = r.frame[0] >= 0 && r.frame[1] >= 0 && r.frame[2] <= r.vw && r.frame[3] <= r.vh && r.dockBottom <= r.vh && Math.abs(r.phoneVsFrame[0] - r.phoneVsFrame[1]) <= 1
  console.log(name.padEnd(13), ok ? 'FITS' : 'PROBLEM', JSON.stringify(r))
  await p.screenshot({ path: `${out}/fit-${name}.png` })
  await ctx.close()
}
await b.close()
