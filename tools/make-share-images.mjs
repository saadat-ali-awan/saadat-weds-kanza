// Renders the link-preview image and the seal icons into public/.
// Usage: node tools/make-share-images.mjs <path to cropped invite card jpg>
import { chromium } from 'playwright'
import fs from 'node:fs'

const card = 'data:image/jpeg;base64,' + fs.readFileSync(process.argv[2]).toString('base64')
const fonts = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Gulzar&family=Pinyon+Script&display=block" rel="stylesheet">'

const og = `<!doctype html><html><head>${fonts}<style>
  body { margin: 0; }
  .og { width: 1200px; height: 630px; display: flex; overflow: hidden;
        background: radial-gradient(ellipse at 70% 45%, #5a1226 0%, #3a0b19 55%, #1c050c 100%);
        font-family: 'Cormorant Garamond', Georgia, serif; color: #fff3d6; }
  .card { width: 470px; height: 630px; flex: none; position: relative; }
  .card img { width: 100%; height: 100%; object-fit: cover; object-position: center 40%; }
  .card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to right, transparent 70%, #3a0b19); }
  .txt { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 0 56px 0 36px; text-align: center; }
  .ur { font-family: 'Gulzar', serif; font-size: 50px; line-height: 1.3; color: #f7dc93; }
  .names { font-family: 'Pinyon Script', cursive; font-size: 90px; white-space: nowrap; line-height: 1.05; color: #f7dc93; text-shadow: 0 3px 18px rgba(0,0,0,.45); }
  .rule { display: flex; align-items: center; gap: 16px; width: 100%; }
  .rule span { flex: 1; height: 1.5px; background: linear-gradient(to right, transparent, rgba(243,217,139,.8)); }
  .rule span:last-child { background: linear-gradient(to left, transparent, rgba(243,217,139,.8)); }
  .rule em { font-style: normal; font-size: 22px; font-weight: 700; letter-spacing: .3em; color: #e9c46a; }
  .when { font-size: 38px; font-weight: 700; }
  .where { font-size: 32px; font-weight: 600; }
  .cta { margin-top: 10px; display: flex; align-items: center; gap: 12px; padding: 12px 28px; border-radius: 999px;
         font-size: 26px; font-weight: 700; color: #3b0a16; background: linear-gradient(180deg, #f7dc93, #d4a443 60%, #b9862c); }
  .cta i { width: 0; height: 0; border-left: 16px solid #3b0a16; border-top: 10px solid transparent; border-bottom: 10px solid transparent; }
</style></head><body><div class="og">
  <div class="card"><img src="${card}"></div>
  <div class="txt">
    <div class="ur">شادی مبارک</div>
    <div class="names">Saadat &amp; Kanza</div>
    <div class="rule"><span></span><em>YOU ARE INVITED</em><span></span></div>
    <div class="when">Sunday, 29 November 2026 · 1 PM</div>
    <div class="where">Dehleez Marquee, H-13, Islamabad</div>
    <div class="cta"><i></i>Watch the video invitation</div>
  </div>
</div></body></html>`

const icon = (size) => `<!doctype html><html><head>${fonts}<style>
  body { margin: 0; }
  .i { width: ${size}px; height: ${size}px; display: grid; place-items: center; background: #2a0812; }
  .s { width: 88%; height: 88%; border-radius: 50%; display: grid; place-items: center;
       background: radial-gradient(circle at 35% 30%, #d2455f, #8d1430 60%, #5c0a1d);
       box-shadow: 0 0 0 ${Math.max(1, size * 0.03)}px #f3d98b inset; }
  .s span { font-family: 'Gulzar', serif; font-size: ${size * 0.5}px; line-height: 1; color: #f7dc93; transform: translate(-6%, 6%); }
</style></head><body><div class="i"><div class="s"><span>ش</span></div></div></body></html>`

const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 1 })
async function shot(html, w, h, path, type) {
  await p.setViewportSize({ width: w, height: h })
  await p.setContent(html, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path, type, quality: type === 'jpeg' ? 86 : undefined, clip: { x: 0, y: 0, width: w, height: h } })
}
await shot(og, 1200, 630, 'public/og-image.jpg', 'jpeg')
for (const [s, name] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  await shot(icon(s), s, s, `public/${name}`, 'png')
}
await b.close()
console.log('done')
