// Frame-accurate timeline measured from the source video (see src/data/timeline.json).
// Every visual property is a pure function of t (seconds), so any moment can be rendered exactly.
import data from './data/timeline.json'

export const SRC_W = 336
export const SRC_H = 606
export const PHONE_W = 430
export const PHONE_H = 932
export const DURATION = data.duration

export type TitleState = 'cream' | 'yellow' | 'orange' | 'blue' | 'pink' | 'lime'

export interface FrameState {
  scene: 'tv+stage' | 'morph' | 'invite'
  tv: { s: number; tx: number; ty: number; title: TitleState; titleCam: { s: number; tx: number; ty: number }; noise: number; bands: number; cursor: 'antenna' | 'top' | 'none'; leds: boolean }
  tvDx: number
  stageDx: number
  cam: { s: number; tx: number; ty: number }
  couple: number
  hold: 'none' | 'bride' | 'groom'
  endMix: number
  brideMix: number
  groomMix: number
  bubbleBride: number
  bubbleGroom: number
  morphFrame: number
  screenFrame: number
  openFrame: number
  frameIndex: number
}

// Piecewise-linear lookup over [t, ...values] keyframes; clamps at both ends.
function interp(keys: number[][], t: number): number[] {
  if (t <= keys[0][0]) return keys[0].slice(1)
  const last = keys[keys.length - 1]
  if (t >= last[0]) return last.slice(1)
  let lo = 0
  let hi = keys.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (keys[mid][0] <= t) lo = mid
    else hi = mid
  }
  const a = keys[lo]
  const b = keys[hi]
  const k = (t - a[0]) / (b[0] - a[0])
  return a.slice(1).map((v, i) => v + (b[i + 1] - v) * k)
}

// Source frames are held, not blended: snap t to the frame being shown at that moment.
const frameTimes: number[] = data.frameTimes
export function frameAt(t: number): number {
  let lo = 0
  let hi = frameTimes.length - 1
  if (t <= frameTimes[0]) return 0
  if (t >= frameTimes[hi]) return hi
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (frameTimes[mid] <= t) lo = mid
    else hi = mid
  }
  return lo
}
export const timeOfFrame = (i: number) => frameTimes[Math.max(0, Math.min(frameTimes.length - 1, i))]

const between = (t: number, [a, b]: number[]) => t >= a && t < b
const fade = (t: number, [a, b]: number[]) => (t <= a ? 1 : t >= b ? 0 : 1 - (t - a) / (b - a))

export function stateAt(tRaw: number, stepped = false): FrameState {
  const frameIndex = frameAt(tRaw)
  const t = stepped ? timeOfFrame(frameIndex) : tRaw

  const [s, tx, ty] = interp(data.tvZoom, t)
  // The title zooms less than the room during the opening push-in
  const [ts, ttx, tty] = interp(data.titleZoom, t)
  let title: TitleState = 'cream'
  for (const [at, name] of data.titleSwitches as [number, TitleState][]) if (t >= at) title = name

  const c = data.cursor
  const cursor = t < c.hideAt ? 'antenna' : between(t, c.topShow) ? 'top' : 'none'
  const leds = data.leds.on.some((r) => between(t, r))

  // The stage slides in slightly behind the TV room; the gap shows the wide room underlay
  const [tvDx] = interp(data.tvPush, t)
  const [stageDx] = interp(data.stagePush, t)
  const [cs, ctx, cty] = interp(data.cam, t)
  const [couple] = interp(data.couple, t)
  // The final wide shot is re-rendered in the source; blend into it during the zoom-out
  const [endMix] = interp(data.endMix, t)
  // Sharp hold frames placed in world space so zooms and pans land on real source detail
  const [brideMix] = interp(data.bridePlate.mix, t)
  const [groomMix] = interp(data.groomPlate.mix, t)

  const hold = between(t, data.brideHold) ? 'bride' : between(t, data.groomHold) ? 'groom' : 'none'
  const [bubbleBride] = interp(data.bubbleBride.alpha, t)
  const [bubbleGroom] = interp(data.bubbleGroom.alpha, t)

  const m = data.morph
  const scene = t < m.times[0] ? 'tv+stage' : t < m.times[m.times.length - 1] ? 'morph' : 'invite'
  let morphFrame = m.first
  for (let i = 0; i < m.times.length; i++) if (t >= m.times[i]) morphFrame = m.first + i

  // Static-to-pattern transition on the TV glass is played from source crops (-1 when not shown)
  const sq = data.screenSeq
  const screenFrame = frameIndex >= sq.first && frameIndex <= sq.last ? frameIndex : -1

  // Opening zoom-out is played from the real HQ frames: the room image alone can't fill the frame edges
  const op = data.openSeq
  const openFrame = frameIndex <= op.last ? op.frames[frameIndex] : -1

  return {
    scene,
    tv: { s, tx, ty, title, titleCam: { s: ts, tx: ttx, ty: tty }, noise: fade(t, data.static.noiseFade), bands: fade(t, data.static.bandsFade), cursor, leds },
    tvDx,
    stageDx,
    cam: { s: cs, tx: ctx, ty: cty },
    couple,
    hold,
    endMix,
    brideMix,
    groomMix,
    bubbleBride: hold === 'bride' ? bubbleBride : 0,
    bubbleGroom: hold === 'groom' ? bubbleGroom : 0,
    morphFrame,
    screenFrame,
    openFrame,
    frameIndex,
  }
}

export const layout = {
  cursor: data.cursor,
  leds: data.leds,
  bubbleBride: data.bubbleBride,
  bridePlate: data.bridePlate,
  groomPlate: data.groomPlate,
  bubbleGroom: data.bubbleGroom,
  morph: data.morph,
  screenSeq: data.screenSeq,
  openSeq: data.openSeq,
  // Camera at the first frame: the wide frame-0 image fills the margins while the room is zoomed out
  tvWideCam: { s: data.tvZoom[0][1], tx: data.tvZoom[0][2], ty: data.tvZoom[0][3] },
  // TV glass bounding box in source pixels (from the extracted screen mask)
  screen: { x: 43, y: 273, w: 200, h: 178 },
}
