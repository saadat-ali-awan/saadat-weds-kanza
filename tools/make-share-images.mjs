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

// App icon: a rolled parchment letter tied with a thin red silk bow, on a wine tile.
// rounded=true gives transparent rounded corners (browser tab, Android); false is a full square (iOS rounds it itself).
const ink = 'stroke="#4a210f" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"'
// a silk ribbon line: dark outline under a red core
const silkLine = (d, extra = '') => `
  <path d="${d}" fill="none" stroke="#4a210f" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round" ${extra}/>
  <path d="${d}" fill="none" stroke="#d62a48" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`
const scrollSvg = `
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7a1530"/><stop offset="1" stop-color="#3a0716"/>
    </linearGradient>
    <linearGradient id="roll" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6e0"/><stop offset=".55" stop-color="#f1dcae"/><stop offset="1" stop-color="#c9a46a"/>
    </linearGradient>
    <linearGradient id="rib" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ef4560"/><stop offset=".5" stop-color="#c81e3c"/><stop offset="1" stop-color="#8e0f2a"/>
    </linearGradient>
  </defs>
  <g transform="translate(50 50) scale(1.08) translate(-50 -56) rotate(-22 50 56)">
    <!-- the rolled letter, curled at both ends -->
    <rect x="14" y="44" width="72" height="20" rx="3" fill="url(#roll)" ${ink}/>
    <path d="M20 47.5 H80 M20 60.5 H80" stroke="#b8935c" stroke-width="1" opacity=".45"/>
    <ellipse cx="14" cy="54" rx="5" ry="10" fill="#f6e4bd" ${ink}/>
    <path d="M14 50 q3 2 0 7 q-2.4 -2 0 -4.5" fill="none" stroke="#4a210f" stroke-width="1.5"/>
    <ellipse cx="86" cy="54" rx="5" ry="10" fill="#f6e4bd" ${ink}/>
    <path d="M86 50 q3 2 0 7 q-2.4 -2 0 -4.5" fill="none" stroke="#4a210f" stroke-width="1.5"/>
    <!-- silk ribbon wrapped round the middle -->
    <rect x="47.5" y="42.5" width="5" height="23" rx="1.2" fill="url(#rib)" ${ink}/>
    <!-- long curling tails -->
    ${silkLine('M50 54 C46 62 42 66 38 72 C35 76 37 80 33 85')}
    ${silkLine('M50 54 C55 61 59 64 62 70 C65 75 63 79 67 83')}
    <!-- the two loops of the bow -->
    ${silkLine('M50 53 C44 44 34 41 33 47 C32 53 42 55 50 53 Z')}
    ${silkLine('M50 53 C56 44 66 41 67 47 C68 53 58 55 50 53 Z')}
    <circle cx="50" cy="53.5" r="3.6" fill="#c41e3a" ${ink}/>
  </g>`
const icon = (size, rounded) => `<!doctype html><html><head><style>
  html, body { margin: 0; background: transparent; }
  svg { display: block; }
</style></head><body>
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100" height="100" rx="${rounded ? 22 : 0}" fill="url(#tile)"/>
  <rect x="4.5" y="4.5" width="91" height="91" rx="${rounded ? 18 : 6}" fill="none" stroke="#e9c46a" stroke-opacity=".55" stroke-width="1.6"/>
  ${scrollSvg}
</svg></body></html>`

const b = await chromium.launch()
const p = await b.newPage({ deviceScaleFactor: 1 })
async function shot(html, w, h, path, type) {
  await p.setViewportSize({ width: w, height: h })
  await p.setContent(html, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path, type, quality: type === 'jpeg' ? 86 : undefined, omitBackground: type === 'png', clip: { x: 0, y: 0, width: w, height: h } })
}
await shot(og, 1200, 630, 'public/og-image.jpg', 'jpeg')
for (const [s, name, rounded] of [[32, 'favicon-32.png', true], [180, 'apple-touch-icon.png', false], [192, 'icon-192.png', true], [512, 'icon-512.png', true]]) {
  await shot(icon(s, rounded), s, s, `public/${name}`, 'png')
}
await b.close()
console.log('done')
