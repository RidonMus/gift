/* ---------------------------------------------------------------------------
 * puzzle.js — a 3x3 tile-swap board.
 *
 * Swap rather than slide, deliberately. A sliding puzzle hides a ninth of the
 * picture behind the empty square and can be shuffled into an unsolvable state;
 * a swap board always shows the whole image and is always one tap from being
 * fixed. That is the right kind of puzzle for a relaxing evening.
 *
 * The board is an array of 9 entries where `board[position] = tileIndex`.
 * Solved means every tile is sitting in its own position.
 * ------------------------------------------------------------------------- */

/* 4x4. Everything below is written in terms of GRID, so this is the only
 * number to change — tileStyle derives the 400% background size and the
 * 0/33.3/66.6/100% offsets from it. */
export const GRID = 4
export const TILE_COUNT = GRID * GRID

export function solvedBoard() {
  return Array.from({ length: TILE_COUNT }, (_, i) => i)
}

export function isSolved(board) {
  return board.every((tile, position) => tile === position)
}

/** How many tiles are currently sitting where they belong. */
export function correctCount(board) {
  return board.reduce((n, tile, position) => (tile === position ? n + 1 : n), 0)
}

/**
 * Fisher-Yates, then a sanity check: reshuffle if we landed on (or too near)
 * the solved state, so the board never opens looking finished.
 */
export function shuffleBoard() {
  let board
  let attempts = 0
  do {
    board = solvedBoard()
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[board[i], board[j]] = [board[j], board[i]]
    }
    attempts++
    // Reshuffle if we happened to land on (or very near) the finished picture,
    // so the board never opens looking like it is already done.
  } while (correctCount(board) > Math.floor(TILE_COUNT / 4) && attempts < 50)
  return board
}

/** Returns a new board with the two positions exchanged. */
export function swapTiles(board, a, b) {
  const next = board.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

/**
 * CSS background offsets that crop one tile out of a single square image.
 * With a 3x3 grid the stops land neatly on 0% / 50% / 100%.
 */
export function tileStyle(tileIndex, imageSrc) {
  const row = Math.floor(tileIndex / GRID)
  const col = tileIndex % GRID
  const step = 100 / (GRID - 1)
  return {
    backgroundImage: `url("${imageSrc}")`,
    backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
    backgroundPosition: `${col * step}% ${row * step}%`,
    backgroundRepeat: 'no-repeat',
  }
}
