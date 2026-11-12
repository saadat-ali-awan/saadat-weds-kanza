// Renders an Urdu line with a Google font in Chromium (proper Nastaliq shaping) to a transparent PNG.
import { chromium } from 'playwright'
import fs from 'node:fs'
const [out, font, text, refText, targetW, color] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage()
await p.setContent(`<link href="https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=block" rel="stylesheet"><span style="font-family:'${font}'">${text}</span>`)
await p.evaluate(() => document.fonts.ready)
const r = await p.evaluate(async ({ font, text, refText, targetW, color }) => {
  await document.fonts.load(`40px "${font}"`, text)
  const c = document.createElement('canvas'), x = c.getContext('2d')
  x.font = `100px "${font}"`
  const size = (100 * targetW) / x.measureText(refText).width
  x.font = `${size}px "${font}"`
  const m = x.measureText(text)
  const pad = Math.ceil(size * 0.9)
  c.width = Math.ceil(m.width) + 2 * pad; c.height = Math.ceil(size * 2.6)
  x.font = `${size}px "${font}"`; x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'alphabetic'
  x.fillStyle = color
  const base = Math.round(size * 1.5)
  x.fillText(text, c.width - pad, base)
  return { url: c.toDataURL('image/png'), size, base, pad, w: m.width }
}, { font, text, refText, targetW: +targetW, color })
fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'))
console.log(JSON.stringify({ size: r.size, base: r.base, pad: r.pad, w: r.w }))
await b.close()
