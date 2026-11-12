import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import Decor from './Decor'
import Player from './Player'
import { PHONE_H, PHONE_W } from './timeline'

const isTool = new URLSearchParams(location.search).has('frame') || new URLSearchParams(location.search).has('t')

// Phone-sized screens get a slimmer frame (styling only; sizing is done in CSS).
function usePhone() {
  const q = '(max-width: 600px), (max-height: 500px)'
  const [phone, setPhone] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

// The frame's size comes from CSS (fits the visible screen with dvh units, so a phone's
// address bar never pushes it off screen). Here we only read that size to scale the 430x932 player.
function useFrameScale() {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / PHONE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, scale }
}

export default function App() {
  const phone = usePhone()
  const { ref, scale } = useFrameScale()
  // The diff tool renders the bare panel at 1:1
  if (isTool) return <main className="page tool"><Player /></main>
  return (
    <main className={`page${phone ? ' on-phone' : ''}`}>
      <Decor />
      <div ref={ref} className="frame">
        <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Player />
        </div>
      </div>
      <Analytics />
    </main>
  )
}
