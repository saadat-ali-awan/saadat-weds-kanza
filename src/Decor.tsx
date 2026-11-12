// Festive page backdrop behind the invite: fairy lights, rising balloons and falling rose/marigold petals.
// Positions come from a seeded generator so the layout is stable between renders.
import type { CSSProperties } from 'react'

function rng(seed: number) {
  let x = seed >>> 0 || 1
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const r = rng(29112026)

const BALLOON_COLORS = [
  ['#f6d38a', '#b8862f'], // gold
  ['#f4a6b8', '#c0516f'], // rose
  ['#ffe9ee', '#d9a5b3'], // blush
  ['#c4314f', '#6d0f25'], // maroon
  ['#fff4dc', '#cdb385'], // ivory
]
const balloons = Array.from({ length: 14 }, (_, i) => ({
  left: (i / 14) * 100 + r() * 6 - 3,
  size: 38 + r() * 34,
  dur: 16 + r() * 14,
  delay: -r() * 30,
  sway: 10 + r() * 22,
  color: BALLOON_COLORS[i % BALLOON_COLORS.length],
}))
const petals = Array.from({ length: 26 }, () => ({
  left: r() * 100,
  size: 9 + r() * 10,
  dur: 9 + r() * 10,
  delay: -r() * 20,
  drift: (r() - 0.5) * 160,
  spin: 360 + r() * 540,
  color: r() < 0.55 ? '#c41e3a' : r() < 0.6 ? '#f59e0b' : '#f97316',
}))
const BULBS = 34

export default function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <div className="decor-glow" />
      <svg className="lights" viewBox="0 0 1000 120" preserveAspectRatio="none">
        <path d="M0 10 Q 250 110 500 40 T 1000 20" fill="none" stroke="#6b4a2a" strokeWidth="1.5" />
      </svg>
      <div className="bulbs">
        {Array.from({ length: BULBS }, (_, i) => {
          const x = i / (BULBS - 1)
          // sit on the wire: the two quadratic segments of the path above (x is linear in s)
          const q = (s: number, a: number, c: number, b: number) => (1 - s) ** 2 * a + 2 * s * (1 - s) * c + s * s * b
          const y = x < 0.5 ? q(2 * x, 10, 110, 40) : q(2 * x - 1, 40, -30, 20)
          return <span key={i} style={{ left: `${x * 100}%`, top: `${(y / 120) * 100}%`, animationDelay: `${(i * 0.37) % 3}s` } as CSSProperties} />
        })}
      </div>
      {balloons.map((b, i) => (
        <div
          key={i}
          className="balloon"
          style={{ left: `${b.left}%`, width: b.size, height: b.size * 1.22, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, '--sway': `${b.sway}px` } as CSSProperties}
        >
          <svg viewBox="0 0 50 80" width="100%" height="160%">
            <defs>
              <radialGradient id={`bg${i}`} cx="35%" cy="30%" r="75%">
                <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="0.18" stopColor={b.color[0]} />
                <stop offset="1" stopColor={b.color[1]} />
              </radialGradient>
            </defs>
            <path d="M25 2 C 42 2 48 18 48 26 C 48 40 34 52 25 55 C 16 52 2 40 2 26 C 2 18 8 2 25 2 Z" fill={`url(#bg${i})`} />
            <path d="M22 55 L28 55 L25 59 Z" fill={b.color[1]} />
            <path d="M25 59 q 4 6 0 11 t 0 10" fill="none" stroke="rgba(255,240,210,0.55)" strokeWidth="0.8" />
          </svg>
        </div>
      ))}
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.8, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, '--drift': `${p.drift}px`, '--spin': `${p.spin}deg` } as CSSProperties}
        />
      ))}
    </div>
  )
}
