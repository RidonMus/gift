import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'
import { hugeCelebrate } from '../utils/celebrate'

/* ---------------------------------------------------------------------------
 * The state machine behind the un-clickable "No".
 *
 * One entry per dodge. `settled` is the last stage: the button gives up,
 * returns to its normal size and spot, and finally becomes clickable — which
 * is the whole joke, because by then the only thing it will admit to is
 * "Are you sure? 🤔".
 * ------------------------------------------------------------------------- */
const NO_STAGES = [
  { label: 'No', scale: 1, settled: false }, // 0 — untouched, still in place
  { label: 'No', scale: 1, settled: false }, // 1 — first jump
  { label: 'No', scale: 0.8, settled: false }, // 2 — jumps + shrinks 20%
  { label: 'Nope.', scale: 0.64, settled: false }, // 3 — shrinks further
  { label: 'Still trying?', scale: 0.5, settled: false }, // 4
  { label: 'Are you sure? 🤔', scale: 1, settled: true }, // 5 — stops, full size
]
const FINAL_STAGE = NO_STAGES.length - 1

const CONFESSION = [
  "You're stuck with me all the way even on the other side of the world.",
  'My jokes are too funny.',
  'I built this entire app just to see you smile.',
  'Because I love you most. 🥰',
]

/**
 * Phase 0.5, reachable from the gallery. A question with only one answer.
 *
 * Touch is handled as carefully as hover here: an iPad has no hover state at
 * all, so a hover-only gag would simply hand her a working "No" button and
 * ruin the joke. Mouse users trigger a dodge on pointerenter, touch users on
 * pointerdown (cancelled before it can become a click), so the button runs
 * away from a finger exactly like it runs away from a cursor.
 */
export default function QuestionScreen({ onBack, name = 'Zukhra' }) {
  const [dodges, setDodges] = useState(0)
  const [spot, setSpot] = useState(null) // null = sitting in its normal place
  const [slot, setSlot] = useState(null) // reserved layout space while detached
  const [showConfession, setShowConfession] = useState(false)
  const [saidYes, setSaidYes] = useState(false)

  const noRef = useRef(null)
  const yesRef = useRef(null)
  // Mirrors of the state above, so a dodge can read "where am I now" without
  // going through a stale closure or doing side effects inside a setState.
  const dodgeRef = useRef(0)
  const spotRef = useRef(null)

  const stage = NO_STAGES[dodges]

  // Measure the button once, so the row does not collapse when it detaches.
  useLayoutEffect(() => {
    if (!slot && noRef.current) {
      const rect = noRef.current.getBoundingClientRect()
      setSlot({ w: rect.width, h: rect.height })
    }
  }, [slot])

  /**
   * Somewhere random, fully on screen, and a good distance from where it just
   * was — otherwise a "jump" of thirty pixels reads as a glitch, not a joke.
   *
   * The only no-go area is the Yes button itself. An earlier version fenced
   * off the whole question card, which looks sensible until you try it on an
   * iPad: a 500px card in a 750px viewport leaves almost no legal spot, every
   * candidate gets rejected, and the button gives up in the same corner every
   * single time. Guarding one small rectangle always has an answer.
   */
  const findSpot = useCallback(
    (from) => {
      const margin = 14
      const w = slot?.w ?? 150
      const h = slot?.h ?? 60
      const maxX = Math.max(margin, window.innerWidth - w - margin)
      const maxY = Math.max(margin, window.innerHeight - h - margin)
      const yes = yesRef.current?.getBoundingClientRect()
      const farEnough = Math.min(window.innerWidth, window.innerHeight) * 0.35

      let best = { x: margin, y: margin }
      let bestDistance = -1

      for (let attempt = 0; attempt < 24; attempt++) {
        const x = margin + Math.random() * (maxX - margin)
        const y = margin + Math.random() * (maxY - margin)

        const onTopOfYes =
          yes && x < yes.right + 12 && x + w > yes.left - 12 && y < yes.bottom + 12 && y + h > yes.top - 12
        if (onTopOfYes) continue

        const distance = from ? Math.hypot(x - from.x, y - from.y) : Infinity
        if (distance > farEnough) return { x, y }
        if (distance > bestDistance) {
          best = { x, y }
          bestDistance = distance
        }
      }
      return best
    },
    [slot],
  )

  const dodge = useCallback(() => {
    if (dodgeRef.current >= FINAL_STAGE) return
    const next = dodgeRef.current + 1
    dodgeRef.current = next
    // On the last step it stops running and comes back to its place.
    const nextSpot = next >= FINAL_STAGE ? null : findSpot(spotRef.current)
    spotRef.current = nextSpot
    setDodges(next)
    setSpot(nextSpot)
  }, [findSpot])

  const handleYes = useCallback(() => {
    setSaidYes(true)
    hugeCelebrate()
  }, [])

  // If the window changes size (or the iPad is rotated) while the button is
  // loose, pull it back inside rather than leaving it stranded off-screen.
  useEffect(() => {
    if (!spot) return undefined
    const onResize = () => {
      const next = findSpot(spotRef.current)
      spotRef.current = next
      setSpot(next)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [spot, findSpot])

  if (saidYes) return <LoveBanner name={name} onBack={onBack} />

  return (
    <div className="relative mx-auto flex min-h-[85vh] w-full max-w-3xl flex-col items-center justify-center px-5 py-10">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-5 top-4 font-hand text-2xl text-ink-faint underline decoration-wavy underline-offset-4 transition-colors hover:text-ink"
      >
        ← back to the memories
      </button>

      <div className="paper-grain relative w-full max-w-xl animate-pop-in rounded-card border-[3px] border-ink/75 bg-paper px-6 py-10 text-center shadow-sketch-lg sm:px-12 sm:py-14">
        <span className="washi -top-3 left-10 -rotate-6 bg-blush" />
        <span className="washi -top-3 right-10 rotate-6 bg-sky" />

        <p className="font-hand text-3xl text-ink-faint sm:text-4xl">Hey there.</p>
        <h1 className="mt-2 font-hand text-5xl font-bold leading-[1.08] text-ink sm:text-6xl">
          Just a quick question.
          <br />
          <span className="marker-underline">Do you love me?</span>
        </h1>

        <div className="mt-10 flex items-center justify-center gap-5">
          <DoodleButton ref={yesRef} size="lg" variant="sage" onClick={handleYes}>
            Yes
          </DoodleButton>

          {/* Reserved space so the row does not jump when No detaches. */}
          <span
            aria-hidden={spot ? 'true' : undefined}
            style={slot && spot ? { width: slot.w, height: slot.h, display: 'inline-block' } : undefined}
          >
            <button
              ref={noRef}
              type="button"
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') dodge()
              }}
              onPointerDown={(e) => {
                // Touch and Pencil: run before the tap can become a click.
                if (e.pointerType !== 'mouse' && dodges < FINAL_STAGE) {
                  e.preventDefault()
                  dodge()
                }
              }}
              onClick={() => {
                if (dodges >= FINAL_STAGE) setShowConfession(true)
              }}
              style={{
                ...(spot ? { position: 'fixed', left: spot.x, top: spot.y, margin: 0, zIndex: 40 } : null),
                transform: `scale(${stage.scale})`,
                transition: 'transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className={[
                'whitespace-nowrap rounded-doodle-alt border-[2.5px] border-blush-deep bg-blush-soft',
                'px-9 py-4 font-hand text-3xl font-semibold leading-none text-ink shadow-sketch',
                'hover:bg-blush focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
                dodges >= FINAL_STAGE ? 'animate-wiggle cursor-pointer' : '',
              ].join(' ')}
            >
              {stage.label}
            </button>
          </span>
        </div>

        <p className="mt-8 min-h-[1.5rem] font-hand text-xl text-ink-faint">
          {dodges === 0
            ? 'take your time, no pressure at all'
            : dodges >= FINAL_STAGE
              ? 'go on then. press it.'
              : 'hmm. that button seems shy.'}
        </p>
      </div>

      {showConfession && <ConfessionModal onClose={() => setShowConfession(false)} onBack={onBack} />}
    </div>
  )
}

/** The prize for finally catching the No button. */
function ConfessionModal({ onClose, onBack }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="I knew it"
    >
      <div
        className="max-h-full w-full max-w-lg animate-pop-in overflow-y-auto rounded-card border-[3px] border-ink/75 bg-paper p-6 shadow-lifted sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-hand text-5xl font-bold leading-tight text-ink">I knew it! ❤️</h2>

        <p className="mt-3 font-body text-base leading-relaxed text-ink-soft sm:text-lg">
          Impossible. Go solve some puzzles my love. Also, you couldn’t click No because:
        </p>

        <ol className="mt-4 space-y-2.5">
          {CONFESSION.map((reason, i) => (
            <li key={reason} className="flex gap-3 font-body text-base leading-relaxed text-ink sm:text-lg">
              <span className="font-hand text-2xl leading-none text-blush-deep">{i + 1}.</span>
              <span>{reason}</span>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <DoodleButton variant="blush" onClick={onBack}>
            Off to the puzzles ✨
          </DoodleButton>
          <DoodleButton variant="ghost" alt size="sm" onClick={onClose}>
            stay here a second
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}

/** What she gets for pressing the button that actually works. */
function LoveBanner({ name, onBack }) {
  return (
    <div className="mx-auto flex min-h-[85vh] w-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center">
      <div className="paper-grain relative w-full animate-pop-in rounded-card border-[3px] border-ink/75 bg-paper px-6 py-12 shadow-sketch-lg sm:px-12">
        <span className="washi -top-3 left-1/2 -translate-x-1/2 -rotate-3 bg-butter" />

        <p className="animate-heart-beat text-6xl">❤️</p>

        <h1 className="mt-4 font-hand text-6xl font-bold leading-[1.05] text-ink sm:text-7xl">
          I love you too, {name}.
        </h1>

        <p className="mt-5 font-body text-base leading-relaxed text-ink-soft sm:text-lg">
          That was never really a question, but it was very nice to hear anyway. Thank you for
          pressing the honest button.
        </p>

        <p className="mt-4 font-hand text-3xl text-blush-deep sm:text-4xl">
          Toronto to Tashkent, and back again. 🤍
        </p>

        <div className="mt-9">
          <DoodleButton size="lg" variant="sage" onClick={onBack}>
            Back to the memories ✨
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}
