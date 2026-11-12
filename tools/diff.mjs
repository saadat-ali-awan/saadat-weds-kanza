// Renders the React build at every source frame and scores it against the decoded source frames.
// Usage: node tools/diff.mjs [step=1] [from=0] [to=last]   (dev server must be running on :5173)
// Writes tools/report/report.json and React screenshots of the worst frames.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const [step = 1, from = 0, to = Infinity] = process.argv.slice(2).map(Number)
const root = path.dirname(new URL(import.meta.url).pathname)
const refDir = path.join(root, process.env.REF || 'ref')
const outDir = path.join(root, 'report')
fs.mkdirSync(outDir, { recursive: true })
const timeline = JSON.parse(fs.readFileSync(path.join(root, '../src/data/timeline.json'), 'utf8'))
const frames = fs.readdirSync(refDir).filter((f) => f.endsWith('.jpg')).sort()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173/?frame=0')
await page.waitForFunction(() => typeof window.__render === 'function')
const phone = page.locator('.phone')

const results = []
for (let i = from; i < Math.min(frames.length, to + 1); i += step) {
  await page.evaluate(async (t) => {
    window.__render(t)
    await Promise.all([...document.images].filter((im) => im.style.visibility !== 'hidden').map((im) => im.decode().catch(() => {})))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  }, timeline.frameTimes[i])
  const shot = (await phone.screenshot()).toString('base64')
  const ref = fs.readFileSync(path.join(refDir, frames[i])).toString('base64')
  // Compare in the browser: the reference is scaled/cropped exactly like the player (fill height, centre crop)
  const r = await page.evaluate(async ({ shot, ref }) => {
    const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src })
    const [a, b] = await Promise.all([load('data:image/png;base64,' + shot), load('data:image/jpeg;base64,' + ref)])
    const W = a.width, H = a.height, K = H / b.height, ox = (W - b.width * K) / 2
    const c = new OffscreenCanvas(W, H), x = c.getContext('2d')
    x.drawImage(b, ox, 0, b.width * K, H)
    const B = x.getImageData(0, 0, W, H).data
    x.clearRect(0, 0, W, H); x.drawImage(a, 0, 0)
    const Ad = x.getImageData(0, 0, W, H).data
    let sum = 0, big = 0
    for (let p = 0; p < Ad.length; p += 4) {
      const d = (Math.abs(Ad[p] - B[p]) + Math.abs(Ad[p + 1] - B[p + 1]) + Math.abs(Ad[p + 2] - B[p + 2])) / 3
      sum += d; if (d > 40) big++
    }
    return { mad: sum / (W * H), bigPct: (100 * big) / (W * H) }
  }, { shot, ref })
  results.push({ frame: i, t: timeline.frameTimes[i], mad: +r.mad.toFixed(2), bigPct: +r.bigPct.toFixed(2) })
  if (i % 50 === 0) console.log(`frame ${i}: mad ${r.mad.toFixed(2)} big ${r.bigPct.toFixed(1)}%`)
}

// Save React screenshots of the worst frames for inspection against tools/ref
const worst = [...results].sort((a, b) => b.mad - a.mad).slice(0, 12)
for (const w of worst) {
  await page.evaluate(async (t) => { window.__render(t); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) }, w.t)
  await phone.screenshot({ path: path.join(outDir, `react_${String(w.frame).padStart(4, '0')}.png`) })
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 1))
const avg = results.reduce((s, r) => s + r.mad, 0) / results.length
console.log(`\n${results.length} frames, mean abs diff ${avg.toFixed(2)} (0-255)`)
console.log('worst:', worst.map((w) => `#${w.frame} ${w.mad}`).join(', '))
await browser.close()
