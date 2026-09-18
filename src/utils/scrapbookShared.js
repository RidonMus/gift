/* ---------------------------------------------------------------------------
 * Constants shared between the on-screen board (ScrapbookCanvas.jsx) and the
 * PNG export (exportScrapbook.js).
 *
 * Both need to agree on exactly where things sit and what colour a note is —
 * if the export used its own copy of SIZES that drifted from the screen's,
 * downloaded boards would silently stop matching what she actually built.
 * ------------------------------------------------------------------------- */

export const BOARD_W = 1200
export const BOARD_H = 900

/* Roughly how big each kind of thing is, in board units. */
export const SIZES = {
  photo: { w: 200, h: 232 },
  note: { w: 180, h: 150 },
  sticker: { w: 78, h: 78 },
}

export const NOTE_COLORS = ['#F7E6AC', '#F6C7CE', '#C7D8C0', '#C5DEEA', '#DACDE9', '#F8D3B8']

/** Colour is picked from the text, so it stays the same on every device without a colour column. */
export function noteColorFor(content) {
  const index = [...String(content)].reduce((sum, c) => sum + c.charCodeAt(0), 0) % NOTE_COLORS.length
  return NOTE_COLORS[index]
}

/* Hand-drawn stickers. `d` paths are in a 0..64 viewBox. `paths` render fills;
 * `extraStrokes` are lines drawn on top with no fill (the tape's creases, the
 * leaf's spine) — kept separate because a fill-and-stroke pass can't express
 * both a filled shape and a bare line in one entry. */
export const STICKER_INK = '#3C3A38'

export const STICKER_DEFS = {
  heart: {
    fill: '#F6C7CE',
    paths: [{ d: 'M32 56 C4 38, 6 14, 20 12 C27 11, 31 16, 32 20 C33 16, 37 11, 44 12 C58 14, 60 38, 32 56 Z' }],
  },
  star: {
    fill: '#F7E6AC',
    paths: [{ d: 'M32 6 L39 24 L58 26 L44 39 L48 58 L32 48 L16 58 L20 39 L6 26 L25 24 Z' }],
  },
  tape: {
    fill: '#C5DEEA',
    fillOpacity: 0.85,
    paths: [{ d: 'M4 24 L60 18 L60 44 L4 50 Z' }],
    extraStrokes: [
      { d: 'M4 24 l8 26 M20 22 l8 26 M36 20 l8 26 M52 19 l8 25', strokeWidth: 1.6, opacity: 0.55 },
    ],
  },
  sparkle: {
    fill: '#DACDE9',
    paths: [{ d: 'M32 4 C34 22, 42 30, 60 32 C42 34, 34 42, 32 60 C30 42, 22 34, 4 32 C22 30, 30 22, 32 4 Z' }],
  },
  leaf: {
    fill: '#C7D8C0',
    paths: [{ d: 'M32 58 C8 44, 10 14, 32 6 C54 14, 56 44, 32 58 Z' }],
    extraStrokes: [{ d: 'M32 12 V54', strokeWidth: 2.2 }],
  },
}

export const STICKER_NAMES = Object.keys(STICKER_DEFS)
