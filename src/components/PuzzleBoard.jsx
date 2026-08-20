import React, { useEffect, useRef, useState } from 'react'
import { GRID, tileStyle } from '../utils/puzzle'

/**
 * The 3x3 board. Interaction is deliberately the simplest thing that works on
 * a touch screen: tap one tile, tap another, they trade places. No dragging to
 * mis-aim, no long-press, no gesture to learn.
 */
export default function PuzzleBoard({ board, imageSrc, solved, onSwap }) {
  const [selected, setSelected] = useState(null)
  const [popping, setPopping] = useState([])
  const popTimer = useRef(null)

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
    popTimer.current = setTimeout(() => setPopping([]), 340)
  }

  return (
    <div
      className={[
        'relative rounded-card border-[3px] border-ink/75 bg-paper p-2.5 shadow-sketch-lg transition-all duration-500 sm:p-3',
        solved ? 'ring-4 ring-sage ring-offset-4 ring-offset-paper' : '',
      ].join(' ')}
    >
      <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2">
        {board.map((tile, position) => {
          const isSelected = selected === position
          const inPlace = tile === position
          return (
            <button
              key={position}
              type="button"
              onClick={() => handleTap(position)}
              disabled={solved}
              aria-label={`Tile ${tile + 1}, position ${position + 1}${inPlace ? ', in place' : ''}`}
              aria-pressed={isSelected}
              style={tileStyle(tile, imageSrc)}
              className={[
                'relative overflow-hidden border-2 bg-paper-deep no-touch-scroll',
                'transition-all duration-200 ease-out',
                position % 2 === 0 ? 'rounded-pebble' : 'rounded-doodle-alt',
                solved
                  ? 'border-transparent'
                  : isSelected
                    ? 'z-10 scale-[1.06] -rotate-2 border-blush-deep shadow-lifted'
                    : 'border-ink/45 hover:-translate-y-0.5 active:scale-95',
                popping.includes(position) ? 'animate-tile-pop' : '',
              ].join(' ')}
            >
              {/* a soft wash over tiles that are already home */}
              {!solved && inPlace && (
                <span className="pointer-events-none absolute inset-0 bg-sage/25" aria-hidden="true" />
              )}
              {isSelected && (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-paper/35 font-hand text-3xl"
                  aria-hidden="true"
                >
                  ↔
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* When it is finished the seams vanish and the picture goes whole. */}
      {solved && (
        <div
          className="pointer-events-none absolute inset-2.5 animate-pop-in rounded-pebble bg-cover bg-center sm:inset-3"
          style={{ backgroundImage: `url("${imageSrc}")` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export { GRID }
