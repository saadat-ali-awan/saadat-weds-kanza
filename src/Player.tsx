import { useEffect, useRef, useState } from 'react'
import { DURATION, PHONE_H, PHONE_W, SRC_H, SRC_W, layout, stateAt, timeOfFrame, type FrameState, type TitleState } from './timeline'
import { drawStatic } from './tvStatic'
import { EVENT, daysToGo } from './event'

const A = '/assets/'
const TITLES: TitleState[] = ['cream', 'yellow', 'orange', 'blue', 'pink', 'lime']
const morphSrc = (i: number) => `${A}morph/m${i}.webp`
const screenSrc = (i: number) => `${A}screen/s${i}.webp`
const openSrc = (i: number) => `${A}open/o${i}.webp`
const OPEN_FRAMES = [...new Set(layout.openSeq.frames)]
const SCREEN_FRAMES = Array.from({ length: layout.screenSeq.last - layout.screenSeq.first + 1 }, (_, k) => layout.screenSeq.first + k)
const MORPH_FRAMES = Array.from({ length: layout.morph.last - layout.morph.first + 1 }, (_, k) => layout.morph.first + k)

const ASSETS = [
  ...TITLES.map((n) => `${A}tv_${n}.webp`),
  `${A}tv_wide.webp`, `${A}title_mask.png`, `${A}cursor.webp`, `${A}leds_on.webp`, `${A}screen_mask.png`,
  `${A}stage_empty.webp`, `${A}stage_couple.webp`, `${A}stage_bride.webp`, `${A}stage_groom.webp`, `${A}stage_end.webp`,
  `${A}bubble_bride.webp`, `${A}bubble_groom.webp`, `${A}invite.webp`,
  ...MORPH_FRAMES.map(morphSrc),
  ...SCREEN_FRAMES.map(screenSrc),
  ...OPEN_FRAMES.map(openSrc),
]

const params = new URLSearchParams(location.search)
const fixedTime = params.has('frame') ? timeOfFrame(Number(params.get('frame'))) : params.has('t') ? Number(params.get('t')) : null
const stepped = params.get('stepped') === '25' || params.get('stepped') === '1'
const TOOL = fixedTime !== null

// Source video pixels are scaled to fill the phone height; the sides are cropped evenly.
const K = PHONE_H / SRC_H
const OFFSET_X = (PHONE_W - SRC_W * K) / 2

function preload(urls: string[]) {
  return Promise.all(urls.map((u) => new Promise<void>((res) => {
    const img = new Image()
    img.onload = img.onerror = () => res()
    img.src = u
  })))
}

const full = { position: 'absolute', left: 0, top: 0, width: SRC_W, height: SRC_H } as const
const px = (v: number) => `${v}px`
// Place a frame captured at camera {s, tx, ty} back into stage-world coordinates
const inWorld = (c: { s: number; tx: number; ty: number }) =>
  ({ position: 'absolute', left: -c.tx / c.s, top: -c.ty / c.s, width: SRC_W / c.s, height: SRC_H / c.s, opacity: 0 }) as const

function useSceneRefs() {
  return {
    tvScene: useRef<HTMLDivElement>(null), tvWorld: useRef<HTMLDivElement>(null), title: useRef<HTMLImageElement>(null),
    titles: useRef<Record<string, HTMLImageElement | null>>({}),
    staticCanvas: useRef<HTMLCanvasElement>(null), screenSeq: useRef<HTMLImageElement>(null), leds: useRef<HTMLImageElement>(null), cursor: useRef<HTMLImageElement>(null),
    stageScene: useRef<HTMLDivElement>(null), camWorld: useRef<HTMLDivElement>(null), couple: useRef<HTMLImageElement>(null),
    bride: useRef<HTMLDivElement>(null), groom: useRef<HTMLDivElement>(null), end: useRef<HTMLImageElement>(null), brideW: useRef<HTMLImageElement>(null), groomW: useRef<HTMLImageElement>(null),
    bubbleBride: useRef<HTMLImageElement>(null), bubbleGroom: useRef<HTMLImageElement>(null),
    morph: useRef<HTMLImageElement>(null), invite: useRef<HTMLImageElement>(null), open: useRef<HTMLImageElement>(null),
  }
}
type SceneRefs = ReturnType<typeof useSceneRefs>

export default function Player() {
  const [ready, setReady] = useState(false)
  const [started, setStarted] = useState(fixedTime !== null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const r = useSceneRefs()
  const [muted, setMuted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [paused, setPaused] = useState(false)
  // Playback clock: follows the music, or wall time if the browser blocks audio. Survives pauses.
  const clock = useRef({ t: 0, last: 0, paused: false })
  const lastStaticFrame = useRef(-1)
  const progressRef = useRef<HTMLDivElement>(null)

  function apply(st: FrameState) {
    applyTo(r, st)
  }

  function applyTo(r: SceneRefs, st: FrameState) {
    const vis = (el: HTMLElement | null, on: boolean) => { if (el) el.style.visibility = on ? 'visible' : 'hidden' }
    const tvVisible = st.scene === 'tv+stage' && st.tvDx < SRC_W + 30
    const stageVisible = st.scene === 'tv+stage' && st.stageDx > 0
    // TV room
    vis(r.tvScene.current, tvVisible)
    if (tvVisible) {
      r.tvScene.current!.style.transform = `translateX(${-st.tvDx}px)`
      r.tvWorld.current!.style.transform = `translate(${st.tv.tx}px, ${st.tv.ty}px) scale(${st.tv.s})`
      for (const n of TITLES) vis(r.titles.current[n], n === st.tv.title)
      vis(r.title.current, st.tv.title === 'cream')
      r.title.current!.style.transform = `translate(${st.tv.titleCam.tx}px, ${st.tv.titleCam.ty}px) scale(${st.tv.titleCam.s})`
      vis(r.leds.current, st.tv.leds)
      const cur = r.cursor.current!
      vis(cur, st.tv.cursor !== 'none')
      const cx = st.tv.cursor === 'top' ? layout.cursor.topX : layout.cursor.x
      const cy = st.tv.cursor === 'top' ? layout.cursor.topY : layout.cursor.y
      cur.style.transform = `translate(${cx}px, ${cy}px)`
      const canvas = r.staticCanvas.current
      const seq = r.screenSeq.current!
      vis(seq, st.screenFrame >= 0)
      if (st.screenFrame >= 0 && seq.dataset.f !== String(st.screenFrame)) {
        seq.dataset.f = String(st.screenFrame)
        seq.src = screenSrc(st.screenFrame)
      }
      // the blurred backdrop copy has no static canvas (the TV glass never shows in the bands)
      if (canvas) canvas.style.visibility = st.screenFrame < 0 && (st.tv.noise > 0 || st.tv.bands > 0) ? 'visible' : 'hidden'
      if (canvas && lastStaticFrame.current !== st.frameIndex) {
        lastStaticFrame.current = st.frameIndex
        drawStatic(canvas.getContext('2d')!, st.frameIndex, st.tv.noise, st.tv.bands)
      }
    }
    // Mehndi stage
    vis(r.stageScene.current, stageVisible)
    if (stageVisible) {
      r.stageScene.current!.style.transform = `translateX(${SRC_W - st.stageDx}px)`
      r.camWorld.current!.style.transform = `translate(${st.cam.tx}px, ${st.cam.ty}px) scale(${st.cam.s})`
      r.couple.current!.style.opacity = String(st.couple)
      vis(r.bride.current, st.hold === 'bride')
      vis(r.groom.current, st.hold === 'groom')
      r.end.current!.style.opacity = String(st.endMix)
      r.brideW.current!.style.opacity = String(st.brideMix)
      r.groomW.current!.style.opacity = String(st.groomMix)
      r.bubbleBride.current!.style.opacity = String(st.bubbleBride)
      r.bubbleGroom.current!.style.opacity = String(st.bubbleGroom)
    }
    // Stage -> invitation morph (image sequence) and the final card
    vis(r.morph.current, st.scene === 'morph')
    if (st.scene === 'morph' && r.morph.current!.dataset.f !== String(st.morphFrame)) {
      r.morph.current!.dataset.f = String(st.morphFrame)
      r.morph.current!.src = morphSrc(st.morphFrame)
    }
    vis(r.invite.current, st.scene === 'invite')
    const op = r.open.current!
    vis(op, st.openFrame >= 0)
    if (st.openFrame >= 0 && op.dataset.f !== String(st.openFrame)) {
      op.dataset.f = String(st.openFrame)
      op.src = openSrc(st.openFrame)
    }
  }

  useEffect(() => {
    preload(ASSETS).then(() => setReady(true))
  }, [])

  // Expose a deterministic seek for tools/diff.mjs
  useEffect(() => {
    if (!ready) return
    ;(window as unknown as { __render: (t: number) => void }).__render = (t: number) => apply(stateAt(t, true))
    apply(stateAt(fixedTime ?? 0, stepped))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    if (!ready || !started || fixedTime !== null) return
    let raf = 0
    const audio = audioRef.current!
    const c = clock.current
    c.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.max(0, (now - c.last) / 1000)
      c.last = now
      if (!c.paused) {
        c.t = !audio.paused && audio.currentTime > 0 ? audio.currentTime : c.t + dt
        apply(stateAt(Math.min(c.t, DURATION), stepped))
        if (progressRef.current) progressRef.current.style.width = `${Math.min(100, (c.t / DURATION) * 100)}%`
        if (c.t >= DURATION) {
          setEnded(true)
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, started, ended])

  const playFrom0 = () => {
    const audio = audioRef.current!
    audio.currentTime = 0
    audio.play().catch(() => {})
    Object.assign(clock.current, { t: 0, paused: false, last: performance.now() })
    setPaused(false)
    setEnded(false)
  }
  const start = () => {
    playFrom0()
    setStarted(true)
  }
  const replay = playFrom0
  const togglePlay = () => {
    if (ended) return playFrom0()
    const audio = audioRef.current!
    const c = clock.current
    c.paused = !c.paused
    if (c.paused) {
      // take the exact time from the music (animation frames can lag in background tabs)
      if (!audio.paused && audio.currentTime > 0) c.t = audio.currentTime
      audio.pause()
    } else {
      audio.currentTime = c.t
      audio.play().catch(() => {})
    }
    setPaused(c.paused)
  }
  const toggleMute = () => {
    audioRef.current!.muted = !muted
    setMuted(!muted)
  }
  const days = daysToGo()

  const scr = layout.screen
  const wide = layout.tvWideCam
  // Clip to the curved TV glass (mask image is in full-frame coordinates)
  const screenMask = {
    maskImage: `url(${A}screen_mask.png)`, WebkitMaskImage: `url(${A}screen_mask.png)`,
    maskMode: 'luminance', maskSize: `${SRC_W}px ${SRC_H}px`, WebkitMaskSize: `${SRC_W}px ${SRC_H}px`,
    maskPosition: `${px(-scr.x)} ${px(-scr.y)}`, WebkitMaskPosition: `${px(-scr.x)} ${px(-scr.y)}`,
  }
  const sceneLayers = (r: SceneRefs, withStatic: boolean) => (
    <>
        <div ref={r.tvScene} style={full}>
          <div ref={r.tvWorld} style={{ ...full, transformOrigin: '0 0' }}>
            <img
              src={`${A}tv_wide.webp`}
              style={{ position: 'absolute', left: -wide.tx / wide.s, top: -wide.ty / wide.s, width: SRC_W / wide.s, height: SRC_H / wide.s }}
              alt=""
            />
            {TITLES.map((n) => (
              <img key={n} ref={(el) => { r.titles.current[n] = el }} src={`${A}tv_${n}.webp`} style={{ ...full, visibility: n === 'cream' ? 'visible' : 'hidden' }} alt="" />
            ))}
            {withStatic && <canvas
              ref={r.staticCanvas}
              width={scr.w}
              height={scr.h}
              style={{ position: 'absolute', left: scr.x, top: scr.y, width: scr.w, height: scr.h, ...screenMask } as React.CSSProperties}
            />}
            <img
              ref={r.screenSeq}
              src={screenSrc(layout.screenSeq.first)}
              style={{ position: 'absolute', left: scr.x, top: scr.y, width: scr.w, height: scr.h, visibility: 'hidden', ...screenMask } as React.CSSProperties}
              alt=""
            />
            <img ref={r.leds} src={`${A}leds_on.webp`} style={{ position: 'absolute', left: layout.leds.x, top: layout.leds.y, width: layout.leds.w, height: layout.leds.h, visibility: 'hidden' }} alt="" />
          </div>
          <img
            ref={r.title}
            src={`${A}tv_cream.webp`}
            style={{ ...full, transformOrigin: '0 0', maskImage: `url(${A}title_mask.png)`, WebkitMaskImage: `url(${A}title_mask.png)`, maskMode: 'luminance' } as React.CSSProperties}
            alt=""
          />
          <img ref={r.cursor} src={`${A}cursor.webp`} style={{ position: 'absolute', left: 0, top: 0, width: layout.cursor.w, height: layout.cursor.h }} alt="" />
        </div>

        <div ref={r.stageScene} style={{ ...full, visibility: 'hidden' }}>
          <div ref={r.camWorld} style={{ ...full, transformOrigin: '0 0' }}>
            <img src={`${A}stage_empty.webp`} style={full} alt="" />
            <img ref={r.couple} src={`${A}stage_couple.webp`} style={{ ...full, opacity: 0 }} alt="" />
            <img ref={r.brideW} src={`${A}stage_bride.webp`} style={inWorld(layout.bridePlate)} alt="" />
            <img ref={r.groomW} src={`${A}stage_groom.webp`} style={inWorld(layout.groomPlate)} alt="" />
            <img ref={r.end} src={`${A}stage_end.webp`} style={{ ...full, opacity: 0 }} alt="" />
          </div>
          <div ref={r.bride} style={{ ...full, visibility: 'hidden' }}>
            <img src={`${A}stage_bride.webp`} style={full} alt="" />
            <img ref={r.bubbleBride} src={`${A}bubble_bride.webp`} style={{ position: 'absolute', left: layout.bubbleBride.x, top: layout.bubbleBride.y, width: layout.bubbleBride.w, height: layout.bubbleBride.h, opacity: 0 }} alt="" />
          </div>
          <div ref={r.groom} style={{ ...full, visibility: 'hidden' }}>
            <img src={`${A}stage_groom.webp`} style={full} alt="" />
            <img ref={r.bubbleGroom} src={`${A}bubble_groom.webp`} style={{ position: 'absolute', left: layout.bubbleGroom.x, top: layout.bubbleGroom.y, width: layout.bubbleGroom.w, height: layout.bubbleGroom.h, opacity: 0 }} alt="" />
          </div>
        </div>

        <img ref={r.morph} src={morphSrc(layout.morph.first)} style={{ ...full, visibility: 'hidden' }} alt="" />
        <img ref={r.invite} src={`${A}invite.webp`} style={{ ...full, visibility: 'hidden' }} alt="" />
        <img ref={r.open} src={openSrc(OPEN_FRAMES[0])} style={full} alt="" />
    </>
  )

  return (
    <div className="phone" style={{ width: PHONE_W, height: PHONE_H }}>
      <div style={{ ...full, transformOrigin: '0 0', transform: `translate(${OFFSET_X}px, 0) scale(${K})` }}>
        {sceneLayers(r, true)}
      </div>

      {started && !TOOL && (
        <>
          <div className={`shade${paused || ended ? ' tall' : ''}`} />
          {ended && (
            <button className="icon replay" onClick={replay} aria-label="Replay">
              <svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" /></svg>
            </button>
          )}
          {(paused || ended) && (
            <div className="details">
              <span className="det-names">Saadat &amp; Kanza</span>
              <div className="det-rule">
                <span />
                <em>{days > 1 ? `${days} days to go` : days === 1 ? 'Tomorrow' : days === 0 ? 'Today' : 'Thank you for coming'}</em>
                <span />
              </div>
              <span className="det-line">Sunday, 29 November 2026 · 1:00 PM</span>
              <a className="det-line det-link" href={EVENT.mapsUrl} target="_blank" rel="noopener">{EVENT.venue}</a>
            </div>
          )}
          <div className="dock-wrap">
            <div className="progress"><div ref={progressRef} /></div>
            <div className="dock">
              <button className="dock-play" onClick={togglePlay} aria-label={paused || ended ? 'Play' : 'Pause'}>
                {paused || ended ? (
                  <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>
                )}
              </button>
              <button className="dock-icon" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? (
                  <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" /></svg>
                )}
              </button>
              <a className="dock-dir" href={EVENT.mapsUrl} target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></svg>
                Directions
              </a>
            </div>
          </div>
        </>
      )}
      <audio ref={audioRef} src="/audio.m4a" preload="auto" />
      {!started && (
        <button className="tap" onClick={start} disabled={!ready}>
          <span className="seal">شادی مبارک</span>
          <span className="tap-label">{ready ? 'Tap to open the invitation' : 'Loading…'}</span>
        </button>
      )}
    </div>
  )
}
