import React, { useEffect } from 'react'
import DoodleButton from './DoodleButton'
import { usePuzzleImage } from '../hooks/useArtwork'
import { celebrate } from '../utils/celebrate'

/**
 * Phase 2. Confetti, then the note that was hiding behind the puzzle.
 * Laid out like a folded letter tucked next to the photo.
 */
export default function RevealScreen({ memory, onColor, onBack }) {
  const image = usePuzzleImage(memory)

  useEffect(() => {
    // A short beat first, so the confetti lands with the card rather than before it.
    const id = setTimeout(celebrate, 260)
    return () => clearTimeout(id)
  }, [memory.id])

  const { headline, body, punchline, signoff } = memory.note

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <p className="animate-fade-up font-hand text-3xl text-sage-deep sm:text-4xl">
        solved, beautifully 🌿
      </p>

      <div
        className="relative mt-4 w-full animate-pop-in rounded-card border-[3px] border-ink/75 bg-paper p-5 shadow-sketch-lg sm:p-8"
        style={{ animationDelay: '120ms' }}
      >
        <span className="washi -top-3 left-10 -rotate-6" style={{ backgroundColor: memory.tapeColor }} />
        <span className="washi -top-3 right-10 rotate-6 bg-butter" />

        <div className="grid gap-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8 sm:items-start">
          {/* the finished picture, framed like a keepsake */}
          <div className="mx-auto w-full max-w-[13rem] -rotate-2">
            <div className="rounded-pebble border-[2.5px] border-ink/60 bg-paper p-2 pb-4 shadow-sketch">
              <img
                src={image}
                alt={memory.title}
                draggable="false"
                className="aspect-square w-full select-none rounded-[10px] object-cover"
              />
              <p className="mt-1.5 text-center font-hand text-xl text-ink-faint">
                {memory.title} {memory.emoji}
              </p>
            </div>
          </div>

          {/* the note */}
          <div className="text-center sm:text-left">
            <h2 className="font-hand text-5xl font-bold leading-[1.05] text-ink sm:text-6xl">
              {headline}
            </h2>

            <p className="mt-4 font-body text-base leading-relaxed text-ink-soft sm:text-lg">{body}</p>

            {punchline && (
              <p className="mt-4 font-hand text-3xl leading-snug text-blush-deep sm:text-4xl">
                {punchline}
              </p>
            )}

            <div className="my-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-ink/15" />
              <span className="animate-heart-beat text-xl">❤️</span>
              <span className="h-px flex-1 bg-ink/15" />
            </div>

            {signoff && <p className="font-hand text-2xl text-ink-faint">{signoff}</p>}
          </div>
        </div>
      </div>

      <div
        className="mt-9 flex animate-fade-up flex-col items-center gap-4 sm:flex-row"
        style={{ animationDelay: '420ms' }}
      >
        <DoodleButton size="lg" variant="blush" onClick={onColor} className="animate-float-soft">
          Unlock Coloring Mode ✨
        </DoodleButton>
        <DoodleButton size="sm" variant="ghost" alt onClick={onBack}>
          ← back to the memories
        </DoodleButton>
      </div>

      <p className="mt-6 max-w-md text-center font-body text-sm leading-relaxed text-ink-faint">
        Next up: the same drawing, but empty. Fill it in however you feel — there is no correct
        version of this and there never was.
      </p>
    </div>
  )
}
