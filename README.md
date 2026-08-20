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

```bash
npm run build
```

Output lands in `dist/`, ready for Netlify, Vercel, GitHub Pages, or anywhere
that serves static files. `vite.config.js` sets `base: './'`, so it works from a
subfolder (like a GitHub Pages project site) without any extra configuration.

Progress is kept in `localStorage`: which memories are unlocked, and the colours
in each drawing. Closing the tab does not lose her work.

```
src/
├── App.jsx                      four phases, and that's the whole router
├── data/memories.js             ← the file you edit
├── components/
│   ├── CozyBackdrop.jsx         paper, pastel light, drifting doodles
│   ├── DoodleButton.jsx         the one button in the app
│   ├── WelcomeScreen.jsx        the note + the gallery
│   ├── MemoryCard.jsx           one taped-in photo
│   ├── PuzzleScreen.jsx         board, reference picture, encouragement
│   ├── PuzzleBoard.jsx          the 4×4 grid itself
│   ├── RevealScreen.jsx         confetti + the love note
│   ├── ColoringScreen.jsx       the colouring book
│   ├── ColorPalette.jsx         colours, tools, brush sizes
│   ├── QuestionScreen.jsx       the question with only one answer
│   └── MissingArt.jsx           shown when a picture file is not there
├── hooks/
│   ├── useArtwork.js            resolves each memory's two pictures
│   ├── useRasterLineArt.js      labels a photo's regions, once, and caches it
│   ├── useFitText.js            shrinks a long title to fit its column
│   └── useStickyState.js        localStorage-backed state
└── utils/
    ├── puzzle.js                board model
    ├── rasterRegions.js         finds fillable regions in a line-art photo
    ├── celebrate.js             the confetti
    └── assets.js                path resolution + image probing
```

Tailwind is pinned to v3 deliberately — it emits CSS with a wider Safari support
range than v4, which matters when the target device is somebody's iPad and you
do not know how old it is. The palette, the handwriting font, and the animations
are all in `tailwind.config.js`; the lopsided "hand-drawn" border radii are the
`.rounded-doodle` / `.rounded-blob` / `.rounded-card` classes in `src/index.css`.

Made by Nodir, with love. 🤍
