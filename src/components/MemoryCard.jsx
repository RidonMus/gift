import React from 'react'
import { usePuzzleImage } from '../hooks/useArtwork'

/**
 * One memory in the gallery, dressed up as a taped-in scrapbook photo.
 * The whole card is the button — easy to hit with a thumb.
 */
export default function MemoryCard({ memory, index, completed, onPick }) {
  const image = usePuzzleImage(memory)

  return (
    <button
      type="button"
      onClick={() => onPick(memory)}
      style={{ transform: `rotate(${memory.tilt}deg)`, animationDelay: `${index * 110}ms` }}
      className="group relative animate-pop-in press-soft focus:outline-none focus-visible:ring-4 focus-visible:ring-butter focus-visible:ring-offset-4 focus-visible:ring-offset-paper rounded-card"
    >
      <div className="rounded-card border-[2.5px] border-ink/70 bg-paper p-3 pb-5 shadow-sketch-lg transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[0.5deg] sm:p-4 sm:pb-6">
        {/* washi tape holding it to the page */}
        <span
          className="washi -top-3 left-1/2 -translate-x-1/2 -rotate-3"
          style={{ backgroundColor: memory.tapeColor }}
        />

        <div className="relative overflow-hidden rounded-pebble border-2 border-ink/50 bg-paper-deep">
          <img
            src={image}
            alt={memory.title}
            draggable="false"
            className="aspect-square w-full select-none object-cover"
          />
          {/* a scattered grid line, like the puzzle is waiting inside */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <g stroke="#FBF9F5" strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
              <path d="M33.3 2 V98 M66.6 2 V98 M2 33.3 H98 M2 66.6 H98" />
            </g>
          </svg>

          {completed && (
            <span className="absolute right-2 top-2 rotate-[-8deg] rounded-pebble border-2 border-sage-deep bg-paper/95 px-2 py-0.5 font-hand text-lg font-semibold text-sage-deep shadow-sketch">
              done ✓
            </span>
          )}
        </div>

        <div className="mt-3 px-1 text-center">
          <h3 className="font-hand text-3xl font-semibold leading-tight text-ink">
            {memory.title} {memory.emoji}
          </h3>
          {memory.subtitle && (
            <p className="mt-0.5 font-hand text-xl leading-tight text-ink-faint">{memory.subtitle}</p>
          )}
        </div>
      </div>
    </button>
  )
}
