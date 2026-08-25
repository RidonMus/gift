import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { GRID } from '../utils/puzzle'
import { bleedZoom, makeCut, piecePath, pieceLayout, seedFrom } from '../utils/jigsaw'

/**
 * The 4x4 board, cut into real interlocking jigsaw pieces.
 *
 * Interaction stays the simplest thing that works on a touch screen: tap one
 * piece, tap another, they trade places. No dragging to mis-aim, no gesture to
 * learn.
 *
 * Note that pieces never move or scale, even on tap. Each one is clipped to a
 * silhouette, and a separate layer traces those same silhouettes as the cut
 * lines you see; nudge a piece and its picture would slide out from under its
 * own outline. Selection is shown with light and a thicker outline instead.
 */
export default function PuzzleBoard({ board, imageSrc, solved, onSwap }) {
  const [selected, setSelected] = useState(null)
  const [popping, setPopping] = useState([])
  const popTimer = useRef(null)

  // Sanitised because useId() contains colons, which are awkward in url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')

  // One cut per picture, stable across reloads so the puzzle she left half
  // finished looks the same when she comes back.
  const cut = useMemo(() => makeCut(GRID, seedFrom(imageSrc || 'cozy')), [imageSrc])
  const paths = useMemo(
    () => Array.from({ length: GRID * GRID }, (_, p) => piecePath(p, cut)),
    [cut],
  )

  useEffect(() => {
    if (solved) setSelected(null)
  }, [solved])

  useEffect(() => () => popTimer.current && clearTimeout(popTimer.current), [])

  function handleTap(position) {
    if (solved) return

    if (selected === null) {
      setSelected(position)
      return
    }
    if (selected === position) {
      setSelected(null)
      return
    }

    onSwap(selected, position)
    setPopping([selected, position])
    setSelected(null)

    if (popTimer.current) clearTimeout(popTimer.current)
    popTimer.current = setTimeout(() => setPopping([]), 430)
  }

  return (
    <div
      className={[
        'relative rounded-card border-[3px] border-ink/75 bg-paper p-2.5 shadow-sketch-lg transition-all duration-500 sm:p-3',
        solved ? 'ring-4 ring-sage ring-offset-4 ring-offset-paper' : '',
      ].join(' ')}
    >
      {/* The silhouettes. objectBoundingBox keeps them resolution-independent,
          so nothing needs regenerating when the board resizes. */}
      <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
        <defs>
          {paths.map((d, p) => (
            <clipPath key={p} id={`${uid}-piece-${p}`} clipPathUnits="objectBoundingBox">
              <path d={d} />
            </clipPath>
          ))}
        </defs>
      </svg>

      <div className="relative aspect-square w-full overflow-hidden rounded-pebble bg-paper-deep">
        {board.map((tile, position) => {
          const isSelected = selected === position
          const inPlace = tile === position
          const L = pieceLayout(position, tile, GRID)

          return (
            <button
              key={position}
              type="button"
              onClick={() => handleTap(position)}
              disabled={solved}
              aria-label={`Tile ${tile + 1}, position ${position + 1}${inPlace ? ', in place' : ''}`}
              aria-pressed={isSelected}
              style={{
                left: `${L.left}%`,
                top: `${L.top}%`,
                width: `${L.size}%`,
                height: `${L.size}%`,
                clipPath: `url(#${uid}-piece-${position})`,
                WebkitClipPath: `url(#${uid}-piece-${position})`,
                zIndex: isSelected ? 30 : inPlace ? 10 : 20,
              }}
              className={[
                'absolute no-touch-scroll transition-[filter] duration-200',
                solved ? 'cursor-default' : 'cursor-pointer',
                isSelected
                  ? 'brightness-110 drop-shadow-[0_6px_10px_rgba(60,58,56,0.45)]'
                  : 'hover:brightness-105',
                popping.includes(position) ? 'animate-piece-pop' : '',
              ].join(' ')}
            >
              <img
                src={imageSrc}
                alt=""
                draggable="false"
                style={{
                  position: 'absolute',
                  left: `${L.imageLeft}%`,
                  top: `${L.imageTop}%`,
                  width: `${L.imageSize}%`,
                  height: `${L.imageSize}%`,
                  maxWidth: 'none',
                }}
                className="pointer-events-none select-none object-cover"
              />

              {/* a soft wash over pieces that are already home */}
              {!solved && inPlace && (
                <span className="pointer-events-none absolute inset-0 bg-sage/25" aria-hidden="true" />
              )}
              {isSelected && (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/35 font-hand text-2xl"
                  aria-hidden="true"
                >
                  ↔
                </span>
              )}
            </button>
          )
        })}

        {/* The cut lines, traced over the top. Same paths, so they land exactly
            on the seams rather than approximating them with borders. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={[
            'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700',
            solved ? 'opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          {board.map((tile, position) => {
            const L = pieceLayout(position, tile, GRID)
            const isSelected = selected === position
            return (
              <g
                key={position}
                transform={`translate(${L.left} ${L.top}) scale(${L.size})`}
              >
                <path
                  d={paths[position]}
                  fill="none"
                  stroke={isSelected ? '#E39BA6' : '#3C3A38'}
                  strokeOpacity={isSelected ? 1 : 0.45}
                  strokeWidth={(isSelected ? 1.6 : 0.7) / L.size}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* When it is finished the seams vanish and the picture goes whole.
          Matched to the pieces' bleed zoom, so completing the puzzle does not
          make the photo jump a few percent as it swaps in. */}
      {solved && (
        <div
          className="pointer-events-none absolute inset-2.5 animate-pop-in overflow-hidden rounded-pebble sm:inset-3"
          aria-hidden="true"
        >
          <img
            src={imageSrc}
            alt=""
            draggable="false"
            style={{
              position: 'absolute',
              inset: 0,
              width: `${bleedZoom(GRID) * 100}%`,
              height: `${bleedZoom(GRID) * 100}%`,
              left: `${((1 - bleedZoom(GRID)) / 2) * 100}%`,
              top: `${((1 - bleedZoom(GRID)) / 2) * 100}%`,
              maxWidth: 'none',
            }}
            className="select-none object-cover"
          />
        </div>
      )}
    </div>
  )
}

export { GRID }
