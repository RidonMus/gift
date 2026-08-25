/* ---------------------------------------------------------------------------
 * jigsaw.js — real interlocking piece shapes.
 *
 * The cut is generated once per picture and belongs to the *board*, not to the
 * pieces: position 6 always has the same silhouette, and swapping two pieces
 * moves the photo between those silhouettes rather than moving the shapes
 * around. That is the choice that makes a swap puzzle look like a jigsaw. If
 * shapes travelled with their pieces, a scrambled board would be a mess of
 * tabs overlapping tabs and holes gaping open; keeping the cut still means the
 * board always reads as one properly interlocked puzzle, and only the picture
 * is scrambled. When it is solved, every tab happens to hold exactly the right
 * sliver of photo anyway.
 *
 * Paths are emitted in objectBoundingBox space (0..1), so one <clipPath> works
 * at any board size without regenerating on resize.
 * ------------------------------------------------------------------------- */

/* Each piece's box is the cell plus room for tabs on all four sides. */
const OVERHANG = 0.25 // of one cell, per side
export const BOX = 1 + OVERHANG * 2 // 1.5 cells square
const INSET = OVERHANG / BOX // where the cell starts inside the box
const SPAN = 1 - INSET * 2 // how much of the box the cell occupies
const KNOB = 0.78 // shrinks the classic curve to a tasteful bulb

function seeded(seed) {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seedFrom(text) {
  let h = 2166136261
  const s = String(text)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Decide every interior cut. `h[r][c]` is the edge between rows r and r+1;
 * `v[r][c]` the edge between columns c and c+1. +1 means the knob bulges down
 * / right, -1 up / left. Neighbours read the same entry from opposite sides,
 * which is what guarantees a tab always meets its matching hole.
 */
export function makeCut(grid, seed) {
  const random = seeded(seed)
  const h = []
  const v = []

  for (let r = 0; r < grid - 1; r++) {
    h[r] = []
    for (let c = 0; c < grid; c++) h[r][c] = random() < 0.5 ? -1 : 1
  }
  for (let r = 0; r < grid; r++) {
    v[r] = []
    for (let c = 0; c < grid - 1; c++) v[r][c] = random() < 0.5 ? -1 : 1
  }
  return { h, v, grid }
}

/**
 * One edge, as cubic curves. `dir` 0 is a flat border; ±1 puts a bulb on the
 * outside or bites one out of the inside. The control points are the classic
 * jigsaw profile: a short neck, a bulb that overhangs it, then a short neck
 * back — which is what stops the knobs looking like plain semicircles.
 */
function edge(p0, p1, normal, dir) {
  const ax = p1[0] - p0[0]
  const ay = p1[1] - p0[1]

  const at = (u, v) => {
    const off = v * dir * SPAN * KNOB
    const x = p0[0] + ax * u + normal[0] * off
    const y = p0[1] + ay * u + normal[1] * off
    return `${x.toFixed(4)} ${y.toFixed(4)}`
  }

  if (!dir) return `L ${at(1, 0)}`

  return [
    `C ${at(0.2, 0)}, ${at(0.5, 0.05)}, ${at(0.4, 0.05)}`,
    `C ${at(0.35, 0.05)}, ${at(0.3, 0.3)}, ${at(0.5, 0.3)}`,
    `C ${at(0.7, 0.3)}, ${at(0.65, 0.05)}, ${at(0.6, 0.05)}`,
    `C ${at(0.5, 0.05)}, ${at(0.8, 0)}, ${at(1, 0)}`,
  ].join(' ')
}

/** The silhouette of the piece that lives at `position`, in 0..1 box space. */
export function piecePath(position, cut) {
  const { grid, h, v } = cut
  const r = Math.floor(position / grid)
  const c = position % grid

  // Outward-facing directions. A neighbour's +1 bulges *into* this piece, so
  // the sign flips on the top and left edges.
  const top = r === 0 ? 0 : -h[r - 1][c]
  const bottom = r === grid - 1 ? 0 : h[r][c]
  const left = c === 0 ? 0 : -v[r][c - 1]
  const right = c === grid - 1 ? 0 : v[r][c]

  const a = [INSET, INSET]
  const b = [1 - INSET, INSET]
  const d = [1 - INSET, 1 - INSET]
  const e = [INSET, 1 - INSET]

  return [
    `M ${a[0]} ${a[1]}`,
    edge(a, b, [0, -1], top),
    edge(b, d, [1, 0], right),
    edge(d, e, [0, 1], bottom),
    edge(e, a, [-1, 0], left),
    'Z',
  ].join(' ')
}

/**
 * How much extra picture to keep around the board, in cells per side.
 *
 * A tab always reaches into its neighbour's cell, so it needs picture from
 * beyond its own slice. For a tile taken from the edge of the photo that
 * neighbour does not exist, and the tab comes back empty — which shows up as a
 * white bite out of the board wherever an edge tile is sitting in an interior
 * slot. Drawing the photo slightly larger than the board gives every tab
 * something real to sample. The cost is about 5% trimmed off each side of the
 * picture, which nobody will ever notice.
 */
const BLEED = OVERHANG

/** Board width in cells, including the bleed. Also the solved-view zoom. */
export const bleedZoom = (grid) => (grid + BLEED * 2) / grid

/**
 * Where a piece's box sits on the board, and how the photo must be shifted
 * inside it so that `tile`'s slice lands in the cell. All in percentages, so
 * the board scales freely.
 */
export function pieceLayout(position, tile, grid) {
  const pr = Math.floor(position / grid)
  const pc = position % grid
  const tr = Math.floor(tile / grid)
  const tc = tile % grid
  const cell = 100 / grid

  return {
    // the box, offset by the overhang so the cell lands on its grid slot
    left: (pc - OVERHANG) * cell,
    top: (pr - OVERHANG) * cell,
    size: BOX * cell,
    // the photo inside the box: board plus bleed, slid so tile aligns
    imageSize: ((grid + BLEED * 2) / BOX) * 100,
    imageLeft: ((OVERHANG - BLEED - tc) / BOX) * 100,
    imageTop: ((OVERHANG - BLEED - tr) / BOX) * 100,
  }
}
