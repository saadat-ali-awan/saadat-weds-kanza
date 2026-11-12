# Shaadi Mubarak invite (React)

A frame-accurate React rebuild of the 37s wedding-invite video, played inside a 430×932 (iPhone Pro Max) section.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and tap to start; the music drives the timeline.

## How it works

- `src/data/timeline.json` holds every timing measured from the source video (camera zoom/pan per frame, push offsets, title colour switches, LED blinks, fades). `src/timeline.ts` turns it into a pure `stateAt(t)`, and `src/Player.tsx` applies that state to layered images each animation frame.
- Artwork layers in `public/assets` were cut from the source frames (room/stage/invitation plates, title colour states, cursor, LEDs, name bubbles), upscaled 4× with Real-ESRGAN (blend of the x4plus and x4plus-anime models) and back-projected onto the source pixels so colours and texture still match. The 336px originals are in `backups/assets-original-336px`.
- The TV static is drawn in code (`src/tvStatic.ts`). Two short stretches that the source renders as generative morphs are played as frame sequences: the static→pattern fade on the TV glass (`assets/screen/`) and the stage→invitation morph (`assets/morph/`).

Debug URLs: `/?t=12.5` or `/?frame=351` freezes on a moment; add `&stepped=1` to snap to the source's frame cadence.

## Checking against the source

```bash
cp /path/to/source.mp4 tools/source.mp4
swift tools/extract-frames.swift tools/source.mp4 tools/ref
node tools/diff.mjs          # dev server must be running; writes tools/report/
```

`/tools/compare.html` shows the source video and the React build side by side with a shared frame scrubber.
