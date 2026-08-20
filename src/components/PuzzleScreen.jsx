import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PuzzleBoard from './PuzzleBoard'
import DoodleButton from './DoodleButton'
import { usePuzzleImage } from '../hooks/useArtwork'
import { correctCount, isSolved, shuffleBoard, swapTiles, TILE_COUNT } from '../utils/puzzle'
import { encouragements, defaultHint } from '../data/memories'

/**
 * Phase 1. A board, a reference photo, and a rotating line of encouragement.
 * There is no clock anywhere in this component, on purpose.
 */
export default function PuzzleScreen({ memory, onSolved, onBack }) {
  const image = usePuzzleImage(memory)
  const [board, setBoard] = useState(() => shuffleBoard())
  const [moves, setMoves] = useState(0)
  const [peeking, setPeeking] = useState(false)
  const [cheerIndex, setCheerIndex] = useState(0)
  const solvedRef = useRef(false)

  const solved = useMemo(() => isSolved(board), [board])
  const inPlace = correctCount(board)

  // Fresh board whenever she opens a different memory.
  useEffect(() => {
    setBoard(shuffleBoard())
    setMoves(0)
    solvedRef.current = false
  }, [memory.id])

  // Rotate the encouragement slowly enough that it never nags.
  useEffect(() => {
    const id = setInterval(() => setCheerIndex((i) => (i + 1) % encouragements.length), 9000)
    return () => clearInterval(id)
  }, [])

  // Let her enjoy the completed picture for a beat before the reveal.
  useEffect(() => {
    if (!solved || solvedRef.current) return
    solvedRef.current = true
    const id = setTimeout(() => onSolved(), 950)
    return () => clearTimeout(id)
  }, [solved, onSolved])

  const handleSwap = useCallback((a, b) => {
    setBoard((current) => swapTiles(current, a, b))
    setMoves((n) => n + 1)
  }, [])

  const handleShuffle = useCallback(() => {
    if (solvedRef.current) return
    setBoard(shuffleBoard())
    setMoves(0)
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 sm:px-8 sm:pt-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 font-hand text-2xl text-ink-faint underline decoration-wavy underline-offset-4 transition-colors hover:text-ink"
      >
        ← back to the memories
      </button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-12">
        {/* ---- the board ---- */}
        <div className="order-2 mx-auto w-full max-w-[34rem] lg:order-1">
          <PuzzleBoard board={board} imageSrc={image} solved={solved} onSwap={handleSwap} />

          <p className="mt-5 text-center font-hand text-3xl text-ink transition-opacity duration-500 sm:text-4xl">
            {solved ? 'Oh, look at that. 🥹' : encouragements[cheerIndex]}
          </p>
          <p className="mt-1 text-center font-body text-sm text-ink-faint">
            {solved
              ? 'perfect, every piece home'
              : `tap one piece, then tap where it should go · ${inPlace}/${TILE_COUNT} in place`}
          </p>
        </div>

        {/* ---- the sidebar ---- */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-8">
          <div className="rounded-card border-[2.5px] border-ink/70 bg-paper p-4 shadow-sketch-lg">
            <span className="washi -top-3 left-6 -rotate-6" style={{ backgroundColor: memory.tapeColor }} />

            <h2 className="font-hand text-4xl font-semibold leading-tight text-ink">
              {memory.title} {memory.emoji}
            </h2>
            {memory.subtitle && <p className="font-hand text-xl text-ink-faint">{memory.subtitle}</p>}

            <div className="mt-3 overflow-hidden rounded-pebble border-2 border-ink/50 bg-paper-deep">
              <img
                src={image}
                alt={`What ${memory.title} should look like`}
                draggable="false"
                className="aspect-square w-full select-none object-cover"
              />
            </div>
            <p className="mt-2 text-center font-hand text-xl text-ink-faint">
              this is where we are heading ↑
            </p>

            <div className="mt-4 rounded-pebble border-2 border-dashed border-blush bg-blush-soft/50 px-3 py-2.5">
              <p className="font-body text-sm leading-relaxed text-ink-soft">
                {memory.hint || defaultHint}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <DoodleButton size="sm" variant="ghost" onClick={handleShuffle} disabled={solved}>
                🔀 shuffle
              </DoodleButton>
              <DoodleButton
                size="sm"
                variant="sky"
                alt
                disabled={solved}
                onPointerDown={() => setPeeking(true)}
                onPointerUp={() => setPeeking(false)}
                onPointerLeave={() => setPeeking(false)}
                onPointerCancel={() => setPeeking(false)}
              >
                👀 hold to peek
              </DoodleButton>
              <span className="ml-auto font-hand text-2xl text-ink-faint">{moves} moves</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Hold-to-peek: the finished picture, full size, for as long as she holds. */}
      {peeking && !solved && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/45 p-8 backdrop-blur-sm">
          <img
            src={image}
            alt={memory.title}
            draggable="false"
            className="max-h-full w-auto max-w-lg animate-pop-in select-none rounded-card border-[3px] border-paper shadow-lifted"
          />
        </div>
      )}
    </div>
  )
}
