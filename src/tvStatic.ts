// TV static drawn per source frame: grey snow plus bright horizontal bands that roll down the glass.
// Seeded by frame index so a given moment always renders the same pixels.

function rng(seed: number) {
  let x = (seed * 2654435761) >>> 0 || 1
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return ((x >>> 0) % 10000) / 10000
  }
}

export function drawStatic(ctx: CanvasRenderingContext2D, frame: number, noise: number, bands: number) {
  const { width: w, height: h } = ctx.canvas
  ctx.clearRect(0, 0, w, h)
  if (noise <= 0 && bands <= 0) return
  const img = ctx.createImageData(w, h)
  const px = img.data
  const r = rng(frame + 1)
  const phase = frame * 3.1 + r() * 4
  for (let y = 0; y < h; y++) {
    // bands: ~16px period, soft-edged, with per-row flicker
    const b = Math.max(0, Math.sin(((y + phase) / 16) * Math.PI * 2))
    const band = Math.pow(b, 2.2) * (0.75 + r() * 0.25)
    const rowJitter = (r() - 0.5) * 30
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const n = r()
      const grey = 62 + n * 95 + rowJitter + band * 75
      const a = Math.max(noise, bands * band * 0.6)
      // warm, desaturated grey like the source's sepia-graded snow
      px[i] = grey * 1.04
      px[i + 1] = grey * 0.95
      px[i + 2] = grey * 0.84
      px[i + 3] = Math.min(255, a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
}
