import React, { useCallback, useEffect, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'
import { addCustomQuestion, deleteCustomQuestion, fetchCustomQuestions } from '../lib/supabase'

/* How long the jar rattles before the note appears. Matches the jar-shake and
 * paper-fly keyframes in tailwind.config.js. */
const SHAKE_MS = 620

/**
 * Fisher–Yates. Used to refill the "bag" of unseen questions.
 */
function shuffle(list) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * The shared question jar.
 *
 * Questions are drawn from a bag rather than picked at random each time: every
 * question gets seen once before any repeats, and the bag is reshuffled when it
 * empties. Pure random would hand her the same question twice in a row often
 * enough to feel broken, which is the one thing a jar like this must not do.
 */
export default function QuestionJar({ onBack }) {
  const [cloudQuestions, setCloudQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState('idle') // idle | shaking | note
  const [current, setCurrent] = useState(null)
  const [bag, setBag] = useState([])

  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [toast, setToast] = useState(null)

  const shakeTimer = useRef(null)
  const toastTimer = useRef(null)
  const inputRef = useRef(null)

  // Only questions fetched from the database are used in the jar.
  const allQuestions = cloudQuestions

  useEffect(() => {
    let cancelled = false
    fetchCustomQuestions()
      .then((rows) => {
        if (!cancelled) setCloudQuestions(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  const flashToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  const drawQuestion = useCallback(() => {
    if (phase === 'shaking') return
    if (loading) {
      flashToast('Checking the jar… 🫙')
      return
    }
    if (allQuestions.length === 0) {
      flashToast('The jar is empty! Drop a note in first ✨')
      return
    }

    setPhase('shaking')
    if (shakeTimer.current) clearTimeout(shakeTimer.current)

    shakeTimer.current = setTimeout(() => {
      // Refill the bag when it runs dry, skipping the note she just read so a
      // reshuffle can't hand back the same one twice in a row.
      setBag((remaining) => {
        let pool = remaining
        if (pool.length === 0) {
          const fresh = shuffle(allQuestions)
          if (fresh.length > 1 && current && fresh[0].id === current.id) {
            ;[fresh[0], fresh[1]] = [fresh[1], fresh[0]]
          }
          pool = fresh
        }
        const [next, ...rest] = pool
        setCurrent(next || null)
        return rest
      })
      setPhase('note')
    }, SHAKE_MS)
  }, [phase, loading, allQuestions, current, flashToast])

  const closeNote = useCallback(() => {
    setPhase('idle')
    setCurrent(null)
  }, [])

  const handleDiscussed = useCallback(
    async (question) => {
      if (!question) return

      const result = await deleteCustomQuestion(question.id)
      if (!result.ok) {
        flashToast(result.error || 'Could not update the jar.')
        return
      }

      setCloudQuestions((current) => current.filter((item) => item.id !== question.id))
      setBag((current) => current.filter((item) => item.id !== question.id))
      closeNote()
      flashToast('Marked as discussed ✨')
    },
    [closeNote, flashToast],
  )

  const openComposer = useCallback(() => {
    setComposing(true)
    setSaveError(null)
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  const handleSave = useCallback(async () => {
    const text = draft.trim()
    if (!text || saving) return

    setSaving(true)
    setSaveError(null)

    const result = await addCustomQuestion(text)

    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }

    // Straight into the master list, so it can be drawn immediately.
    setCloudQuestions((current) => [...current, result.question])
    // Drop it in the bag too, otherwise a new note waits out the current
    // shuffle before it can ever come up.
    setBag((remaining) => {
      const at = Math.floor(Math.random() * (remaining.length + 1))
      const next = remaining.slice()
      next.splice(at, 0, result.question)
      return next
    })

    setDraft('')
    setComposing(false)
    flashToast('Dropped in the jar! ✨')
  }, [draft, saving, flashToast])

  return (
    <div className="mx-auto flex min-h-[85vh] w-full max-w-3xl flex-col items-center px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="self-start font-hand text-2xl text-ink-faint underline decoration-wavy underline-offset-4 transition-colors hover:text-ink"
      >
        ← back to the memories
      </button>

      <div className="mt-2 text-center">
        <h1 className="font-hand text-5xl font-bold leading-tight text-ink sm:text-6xl">
          Our <span className="marker-underline">question jar</span> 🫙
        </h1>
        <p className="mx-auto mt-3 max-w-md font-body text-base leading-relaxed text-ink-soft">
          Our question jar. Tap it for something to talk about and leave a note in here
          whenever you think of one.
        </p>
      </div>

      {/* ---- the jar ---- */}
      <div className="relative mt-8 flex flex-col items-center">
        {/* the slip that leaps out while the jar is rattling */}
        {phase === 'shaking' && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-6 z-10 h-9 w-12 animate-paper-fly rounded-[3px] border-2 border-ink/60 bg-butter-soft shadow-sketch"
          />
        )}

        <button
          type="button"
          onClick={drawQuestion}
          aria-label="Draw a question from the jar"
          className="group rounded-blob focus:outline-none focus-visible:ring-4 focus-visible:ring-butter focus-visible:ring-offset-4 focus-visible:ring-offset-paper"
        >
          <MasonJar shaking={phase === 'shaking'} count={allQuestions.length} />
        </button>

        <p className="mt-3 font-hand text-2xl text-ink-faint">
          {phase === 'shaking'
            ? 'shaking…'
            : loading
            ? 'checking the jar…'
            : allQuestions.length === 0
            ? 'the jar is empty'
            : 'tap the jar'}
        </p>
        <p className="font-body text-xs text-ink-faint/80">
          {loading
            ? 'Loading…'
            : allQuestions.length === 0
            ? 'No questions yet'
            : `${allQuestions.length} ${allQuestions.length === 1 ? 'question' : 'questions'} inside`}
        </p>
      </div>

      {/* ---- add your own ---- */}
      <div className="mt-8 w-full max-w-md">
        {!composing ? (
          <div className="flex justify-center">
            <DoodleButton variant="sage" alt onClick={openComposer}>
              + Drop a note in the jar
            </DoodleButton>
          </div>
        ) : (
          <div className="animate-pop-in rounded-card border-[2.5px] border-ink/70 bg-paper p-4 shadow-sketch-lg">
            <label htmlFor="jar-note" className="font-hand text-2xl text-ink">
              What do you want to ask me?
            </label>
            <textarea
              id="jar-note"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                }
                if (e.key === 'Escape') setComposing(false)
              }}
              rows={3}
              maxLength={280}
              placeholder="Write it here…"
              className="mt-2 w-full resize-none rounded-pebble border-2 border-ink/40 bg-paper-deep px-3 py-2 font-body text-base text-ink placeholder:text-ink-faint/70 focus:border-ink/70 focus:outline-none"
            />

            <div className="mt-1 flex items-center justify-between">
              <span className="font-body text-xs text-ink-faint">{draft.length}/280</span>
              {saveError && <span className="font-body text-xs text-blush-deep">{saveError}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <DoodleButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setComposing(false)
                  setSaveError(null)
                }}
              >
                never mind
              </DoodleButton>
              <DoodleButton size="sm" variant="blush" onClick={handleSave} disabled={!draft.trim() || saving}>
                {saving ? 'dropping…' : 'Save'}
              </DoodleButton>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 animate-pop-in rounded-doodle border-[2.5px] border-sage-deep bg-sage-soft px-6 py-3 font-hand text-2xl text-ink shadow-lifted">
          {toast}
        </div>
      )}

      {phase === 'note' && current && (
        <StickyNote
          question={current}
          onAnother={drawQuestion}
          onClose={closeNote}
          onDiscuss={handleDiscussed}
        />
      )}
    </div>
  )
}

/** A hand-drawn glass mason jar, with folded slips settled in the bottom. */
function MasonJar({ shaking, count }) {
  const slips = count === 0 ? 0 : Math.min(7, Math.max(1, Math.round(count / 2)))

  return (
    <svg
      viewBox="0 0 200 240"
      className={[
        'h-56 w-auto origin-bottom transition-transform duration-200 sm:h-64',
        shaking ? 'animate-jar-shake' : 'group-hover:-translate-y-1 group-active:scale-95',
      ].join(' ')}
      role="img"
      aria-label="A glass jar full of folded notes"
    >
      <g stroke="#3C3A38" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* lid */}
        <rect x="62" y="14" width="76" height="24" rx="7" fill="#C3D5BC" />
        <path d="M62 26 H138" strokeWidth="3" opacity="0.6" />
        {/* neck threads */}
        <path d="M70 38 h60 v12 h-60 z" fill="#E4EDE0" />
        {/* body */}
        <path
          d="M64 50 q-14 10 -14 34 v112 q0 20 20 20 h60 q20 0 20 -20 V84 q0 -24 -14 -34 z"
          fill="#E2EFF5"
          fillOpacity="0.55"
        />
        {/* folded notes resting inside */}
        <g strokeWidth="3">
          {Array.from({ length: slips }).map((_, i) => {
            const row = Math.floor(i / 3)
            const col = i % 3
            const x = 66 + col * 26 + (row % 2) * 10
            const y = 178 - row * 22
            const tilt = ((i * 37) % 30) - 15
            const fills = ['#FBF2D6', '#FAE3E6', '#E4EDE0', '#E2EFF5']
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="22"
                height="16"
                rx="3"
                fill={fills[i % fills.length]}
                transform={`rotate(${tilt} ${x + 11} ${y + 8})`}
              />
            )
          })}
        </g>
        {/* glass highlight */}
        <path d="M74 74 q-8 12 -8 30 v54" strokeWidth="5" opacity="0.35" stroke="#FFFFFF" />
        <path d="M64 50 q-14 10 -14 34 v112 q0 20 20 20 h60 q20 0 20 -20 V84 q0 -24 -14 -34" />
        {/* a little heart etched on the glass */}
        <path
          d="M100 92 c-9 -10 -22 2 -11 12 l11 11 l11 -11 c11 -10 -2 -22 -11 -12 z"
          strokeWidth="3"
          fill="#F3C4CB"
          fillOpacity="0.8"
        />
      </g>
    </svg>
  )
}

/** The drawn question, unfolded in the middle of the screen. */
function StickyNote({ question, onAnother, onClose, onDiscuss }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-5 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="A question from the jar"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md animate-note-unfold rounded-card border-[3px] border-ink/75 bg-butter-soft px-6 py-10 text-center shadow-lifted sm:px-10 sm:py-12"
      >
        <span className="washi -top-3 left-1/2 -translate-x-1/2 -rotate-3 bg-blush" />

        {/* the crease it was folded along */}
        <span aria-hidden="true" className="absolute inset-x-6 top-1/2 h-px bg-ink/10" />

        <p className="font-hand text-3xl leading-snug text-ink sm:text-4xl">{question.text}</p>

        {question.source === 'cloud' && (
          <p className="mt-4 font-hand text-xl text-ink-faint">— one of ours 💌</p>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <DoodleButton variant="sage" onClick={onAnother}>
            another one 🫙
          </DoodleButton>
          <DoodleButton variant="blush" onClick={() => onDiscuss?.(question)}>
            Mark as discussed
          </DoodleButton>
          <DoodleButton size="sm" variant="ghost" alt onClick={onClose}>
            close
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}
