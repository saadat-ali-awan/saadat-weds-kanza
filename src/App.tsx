import { useEffect, useState } from 'react'
import Decor from './Decor'
import Player from './Player'
import { PHONE_H, PHONE_W } from './timeline'

const isTool = new URLSearchParams(location.search).has('frame') || new URLSearchParams(location.search).has('t')

// Scale the 430x932 panel to fit the visible window, leaving room for the gold frame and the backdrop.
function useFit() {
  const calc = () => {
    // visualViewport is the area actually visible on phones (excludes the browser's address bar)
    const w = window.visualViewport?.width ?? window.innerWidth
    const h = window.visualViewport?.height ?? window.innerHeight
    const phone = w < 600 || h < 500
    const pad = phone ? 24 : 48
    return { phone, h, scale: Math.min((w - pad) / PHONE_W, (h - pad) / PHONE_H) }
  }
  const [fit, setFit] = useState(calc)
  useEffect(() => {
    const on = () => setFit(calc())
    window.addEventListener('resize', on)
    window.visualViewport?.addEventListener('resize', on)
    return () => {
      window.removeEventListener('resize', on)
      window.visualViewport?.removeEventListener('resize', on)
    }
  }, [])
  return fit
}

export default function App() {
  const { phone, h, scale } = useFit()
  // The diff tool renders the bare panel at 1:1
  if (isTool) return <main className="page tool"><Player /></main>
  return (
    <main className={`page${phone ? ' on-phone' : ''}`} style={{ height: h }}>
      <Decor />
      <div className="frame" style={{ width: PHONE_W * scale, height: PHONE_H * scale }}>
        <div style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Player />
        </div>
      </div>
    </main>
  )
}
