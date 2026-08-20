# 🫖 Zukhra's Cozy Corner

A small, quiet, hand-drawn corner of the internet: solve a gentle puzzle, find
a love note hiding behind it, then colour the picture in. Built to be used on an
iPad, with a finger or an Apple Pencil.

No timers. No score. Nothing you can get wrong.

---

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open the printed URL. Vite binds to your network too, so you can open that
same URL on the iPad if it's on the same Wi-Fi.

```bash
npm run build
```

Output lands in `dist/`, ready for Netlify, Vercel, GitHub Pages, or anywhere
that serves static files. `vite.config.js` sets `base: './'`, so it works from a
subfolder (like a GitHub Pages project site) without any extra configuration.

---

## The flow

| Phase | Screen | What happens |
| --- | --- | --- |
| 1 | **Welcome** | A handwritten note, then three memories taped in like scrapbook photos |
| 2 | **Puzzle** | A 3×3 tile-swap board with a reference picture and rotating encouragement |
| 3 | **Reveal** | Soft pastel confetti, then the note that was hiding behind the puzzle |
| 4 | **Colouring** | The same drawing, empty, with a palette, brush, eraser, and a save button |

Progress is kept in `localStorage`: which memories are unlocked, and the colours
in each drawing. Closing the tab does not lose her work.

---

## Making it yours

**Names, notes, and jokes** live in [`src/data/memories.js`](src/data/memories.js).
That is the one file to edit. Each memory has a title, a nudge shown during the
puzzle, and a `note` with a headline, a story, a punchline, and a sign-off — the
inside jokes are placeholders, so replace them with your own.

**Her name** is the `HER_NAME` constant at the top of [`src/App.jsx`](src/App.jsx).
It is used in the greeting and signed onto every saved drawing.

**Pictures** go in [`public/images/`](public/images/) — see the README there.
Until you add them, the app uses three hand-drawn scenes built into the code, so
it looks complete from the first run.

---

## How it's put together

```
src/
├── App.jsx                      four phases, and that's the whole router
├── art/scenes.js                the artwork, as code
├── data/memories.js             ← the file you edit
├── components/
│   ├── CozyBackdrop.jsx         paper, pastel light, drifting doodles
│   ├── DoodleButton.jsx         the one button in the app
│   ├── WelcomeScreen.jsx        the note + the gallery
│   ├── MemoryCard.jsx           one taped-in photo
│   ├── PuzzleScreen.jsx         board, reference picture, encouragement
│   ├── PuzzleBoard.jsx          the 3×3 grid itself
│   ├── RevealScreen.jsx         confetti + the love note
│   ├── ColoringScreen.jsx       the colouring book
│   └── ColorPalette.jsx         colours, tools, brush sizes
├── hooks/
│   ├── useArtwork.js            photo-or-fallback, and the two SVG sheets
│   └── useStickyState.js        localStorage-backed state
└── utils/
    ├── puzzle.js                board model
    ├── celebrate.js             the confetti
    └── assets.js                path resolution + image probing
```

### Three ideas worth knowing about

**The artwork is a function, not a file.** Each scene in `src/art/scenes.js` is
written once as a function of `f`, a lookup that turns a region id into a fill
colour. Pass it the scene's pastel palette and you get the finished picture for
the puzzle; pass it her chosen colours and you get the colouring page. One
drawing, two jobs, always in sync.

**The colouring page is three stacked sheets.** A paint layer (her flood fills,
outlines stripped out), then the brush canvas, then an ink layer (the outlines,
every region flat white) composited with `mix-blend-mode: multiply`.

White is the identity for multiply, so the colours underneath come through
untouched while the black lines stay black. The reason it is worth the trouble:
because that ink sheet is genuinely opaque, a mug drawn over a hillside hides the
hillside's outline, exactly as it does in the colour version. Leave the regions
transparent instead and every background line ghosts straight through every
foreground object — which is what turns a colouring page into spaghetti.

**Swap, not slide.** A sliding 3×3 puzzle hides a ninth of the picture behind the
empty square and can be shuffled into states that cannot be solved. A swap board
always shows the whole image and is always one tap from being finished. That is
the right kind of puzzle for a relaxing evening.

### On the iPad specifically

* Everything runs on **pointer events**, so finger, Pencil, and mouse all take
  the same path through the code.
* Apple Pencil **pressure** varies the brush width; **coalesced events** are
  replayed so a fast stroke curves instead of turning into straight segments.
* `touch-action: none` on the canvas stops Safari from scrolling or zooming the
  page out from under a stroke, and the viewport meta tag blocks the double-tap
  zoom.
* Every control is at least 44px tall.
* Saving offers both a download button and a press-and-hold hint, because
  **Save to Photos** is the more natural gesture on iPadOS.
* `prefers-reduced-motion` is respected throughout, confetti included.

---

## Built with

[React 18](https://react.dev) · [Vite 5](https://vite.dev) ·
[Tailwind CSS 3.4](https://tailwindcss.com) ·
[canvas-confetti](https://github.com/catdad/canvas-confetti)

Tailwind is pinned to v3 deliberately — it emits CSS with a wider Safari support
range than v4, which matters when the target device is somebody's iPad and you
do not know how old it is. The palette, the handwriting font, and the animations
are all in `tailwind.config.js`; the lopsided "hand-drawn" border radii are the
`.rounded-doodle` / `.rounded-blob` / `.rounded-card` classes in `src/index.css`.

Made by hand, from far away. 🤍
