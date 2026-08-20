import React, { useMemo } from 'react'
import MemoryCard from './MemoryCard'
import { memories, greetings } from '../data/memories'

/**
 * The front door: a handwritten note, then the three memories laid out like
 * photos taped into a journal.
 */
export default function WelcomeScreen({ completed, onPick, onAskQuestion, name = 'Zukhra' }) {
  // One greeting per visit, so it feels a little different each time.
  const greeting = useMemo(() => greetings[Math.floor(Math.random() * greetings.length)], [])
  const allDone = memories.every((m) => completed.includes(m.id))

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      {/* ---- the note ---- */}
      <div className="relative mx-auto max-w-2xl animate-fade-up">
        <div className="paper-grain relative rounded-card border-[2.5px] border-ink/70 bg-paper px-6 py-8 shadow-sketch-lg sm:px-10 sm:py-10">
          <span className="washi -top-3 left-8 -rotate-6 bg-butter" />
          <span className="washi -top-3 right-8 rotate-6 bg-sage" />

          <p className="font-hand text-2xl text-ink-faint sm:text-3xl">a little note for you —</p>

          <h1 className="mt-1 font-hand text-5xl font-bold leading-[1.05] text-ink sm:text-7xl">
            Hi {name}, welcome to
            <br />
            <span className="marker-underline">your cozy corner</span> ✨
          </h1>

          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-ink-soft sm:text-lg">
            {greeting} There is no score here, no timer, and no annoying people 😂. Put a memory
            back together, read what I left inside it, then colour it in however you like. I miss you, 
            and I hope this little corner of the internet makes you feel a little less lonely.
          </p>

          <p className="mt-4 font-hand text-3xl text-blush-deep sm:text-4xl">
            Miss you and I love you. ❤️
          </p>

          <div className="pointer-events-none absolute -bottom-4 -right-3 animate-float-soft text-4xl sm:text-5xl">
            🫖
          </div>
        </div>
      </div>

      {/* ---- the one question ---- */}
      <div className="mt-8 flex justify-center animate-fade-up" style={{ animationDelay: '260ms' }}>
        <button
          type="button"
          onClick={onAskQuestion}
          className="group relative rounded-doodle-alt border-[2.5px] border-dashed border-blush-deep bg-blush-soft/60 px-7 py-4 shadow-sketch press-soft transition-colors hover:bg-blush-soft focus:outline-none focus-visible:ring-4 focus-visible:ring-butter"
        >
          <span className="font-hand text-3xl font-semibold text-ink sm:text-4xl">
            A Quick Question
          </span>
          <span className="ml-2 inline-block animate-float-soft text-2xl">💌</span>
          <span className="mt-0.5 block font-hand text-xl text-ink-faint">
            (I promise it’s not a quiz)
          </span>
        </button>
      </div>

      {/* ---- the gallery ---- */}
      <div className="mt-14 sm:mt-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-hand text-4xl font-semibold text-ink sm:text-5xl">Pick a memory 🧩</h2>
          <p className="font-hand text-2xl text-ink-faint">
            {completed.length} of {memories.length} unlocked
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {memories.map((memory, i) => (
            <MemoryCard key={memory.id} memory={memory} index={i} onPick={onPick} />
          ))}
        </div>

        {allDone && (
          <p className="mt-12 text-center font-hand text-3xl text-sage-deep animate-fade-up">
            You found every single one. Of course you did. 🌷
          </p>
        )}
      </div>

      <p className="mt-16 text-center font-hand text-2xl text-ink-faint">
        made by Nodir, from far away, for you 💌
      </p>
    </div>
  )
}
