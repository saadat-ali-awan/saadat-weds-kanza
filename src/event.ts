// Wedding details used by the buttons under the invite card. Edit here.
export const EVENT = {
  title: 'Saadat & Kanza — Shaadi',
  // Sunday 29 November 2026, 1:00 PM Pakistan time
  start: new Date('2026-11-29T13:00:00+05:00'),
  venue: 'Dehleez Marquee, H-13, Islamabad',
  mapsUrl: 'https://maps.app.goo.gl/WQMQtdL2kTkLYmpu6',
}

export function daysToGo(now = new Date()) {
  return Math.ceil((EVENT.start.getTime() - now.getTime()) / 86_400_000)
}
