// Screenshot the normal (phone) panel at given times: node tools/shot-panel.mjs out.png 0.5 16.5 ...
import { chromium } from 'playwright'
const [out, ...ts] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 520, height: 1000 }, deviceScaleFactor: 1 })
await p.goto('http://localhost:5173/')
await p.waitForFunction(() => !document.querySelector('.tap')?.disabled)
await p.click('.tap')
await p.evaluate(() => { document.querySelector('audio').muted = true })
await p.waitForTimeout(300)
await p.click('[aria-label=Pause]')
const shots = []
for (const t of ts) {
  await p.evaluate(async (t) => {
    window.__render(+t)
    await Promise.all([...document.images].map((im) => im.decode().catch(() => {})))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }, t)
  shots.push(await p.locator('.phone').screenshot())
}
const { default: fs } = await import('node:fs')
shots.forEach((s, i) => fs.writeFileSync(out.replace('.png', `_${i}.png`), s))
await b.close()
