import React, { useCallback, useEffect, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'
import { addTreeNote, fetchTreeNotes } from '../lib/supabase'

/* ---------------------------------------------------------------------------
 * The note tree.
 *
 * Placement is the whole trick here. Hashing an id straight into an (x, y)
 * pair is the obvious approach and the wrong one — it scatters post-its into
 * empty air beside the tree, because nothing in the hash knows where the
 * branches actually are. So the hash instead picks from ANCHORS, a set of
 * points sampled along the branch curves below, and then jitters a little
 * around that. Notes always land on wood, and because every step is driven by
 * the id, a note keeps its exact spot forever.
 * ------------------------------------------------------------------------- */

/* Points sampled along the branch paths drawn in <TreeArt/>, in that SVG's
 * 400x400 coordinates. Keep these in step with the paths if you redraw it. */
const ANCHORS = [
  // left lower branch
  [174, 260], [158, 255], [144, 249], [132, 243],
  // its twig
  [146, 246], [139, 234], [130, 223],
  // right lower branch
  [214, 239], [232, 236], [248, 231], [261, 224],
  // its twig
  [245, 224], [253, 213], [264, 202],
  // left upper branch
  [183, 200], [172, 193], [160, 185],
  // right upper branch
  [205, 206], [217, 200], [230, 192],
  // crown, left
  [186, 166], [179, 156], [170, 146], [159, 136], [150, 129],
  // crown, right
  [199, 166], [208, 158], [218, 151], [232, 142], [243, 134],
  // along the trunk itself
  [196, 300], [190, 282], [196, 250], [200, 228],
]

const PASTELS = ['#F6C7CE', '#F7E6AC', '#C7D8C0', '#C5DEEA', '#DACDE9', '#F8D3B8', '#C9E4D8']

/* A tree hung with three hundred notes is a hedge. Show the most recent, and
 * say so, rather than quietly dropping the rest. */
const MAX_LEAVES = 60

/** FNV-1a — small, fast, and stable across browsers and reloads. */
function hashId(id) {
  const text = String(id)
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: a seeded PRNG, so one id yields one fixed sequence. */
function seeded(seed) {
  let state = seed
  return function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Where a note hangs, what colour it is, and how crooked. Derived entirely
 * from the id, so it is identical on her iPad and mine, today and next year.
 */
function placeLeaf(id) {
  const random = seeded(hashId(id))
  const [ax, ay] = ANCHORS[Math.floor(random() * ANCHORS.length)]
  const jitterX = (random() - 0.5) * 13
  const jitterY = (random() - 0.5) * 13
  const tilt = (random() - 0.5) * 46
  const color = PASTELS[Math.floor(random() * PASTELS.length)]
  // SVG is 400 wide inside a square box, so /4 converts to a percentage.
  return { left: (ax + jitterX) / 4, top: (ay + jitterY) / 4, tilt, color }
}

function formatWhen(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000)

  if (days === 0) return 'left today'
  if (days === 1) return 'left yesterday'
  if (days < 7) return `left ${days} days ago`

  const sameYear = date.getFullYear() === new Date().getFullYear()
  return `left on ${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)}`
}

export default function BonsaiTree({ onBack }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [toast, setToast] = useState(null)

  const inputRef = useRef(null)
  const toastTimer = useRef(null)
  const justAdded = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetchTreeNotes().then((rows) => {
      if (cancelled) return
      setNotes(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), [])

  const flashToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  const handleSave = useCallback(async () => {
    const text = draft.trim()
    if (!text || saving) return

    setSaving(true)
    setSaveError(null)
    const result = await addTreeNote(text)
    setSaving(false)

    if (!result.ok) {
      setSaveError(result.error)
      return
    }

    justAdded.current = result.note.id
    setNotes((current) => [result.note, ...current])
    setDraft('')
    setComposing(false)
    flashToast('Hung on the tree ✨')
  }, [draft, saving, flashToast])

  const visible = notes.slice(0, MAX_LEAVES)

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
          Our <span className="marker-underline">note tree</span> 🌱
        </h1>
        <p className="mx-auto mt-3 max-w-md font-body text-base leading-relaxed text-ink-soft">
          Leave a little note and it grows a leaf. Tap any leaf to read what the other one was
          thinking that day.
        </p>
      </div>

      {/* ---- the tree ---- */}
      <div className="relative mt-4 aspect-square w-full max-w-[min(100%,30rem,62vh)]">
        <TreeArt />

        {visible.map((note, i) => {
          const spot = placeLeaf(note.id)
          const isNew = justAdded.current === note.id
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => setOpen(note)}
              aria-label={`Note: ${note.message.slice(0, 40)}${note.message.length > 40 ? '…' : ''}`}
              title={note.message.slice(0, 60)}
              style={{
                left: `${spot.left}%`,
                top: `${spot.top}%`,
                backgroundColor: spot.color,
                transform: `translate(-50%, -50%) rotate(${spot.tilt}deg)`,
                animationDelay: `${Math.min(i * 45, 900)}ms`,
              }}
              className={[
                'absolute h-[4.6%] w-[4.6%] min-h-[15px] min-w-[15px] rounded-[2px]',
                'border border-ink/45 shadow-sketch',
                'transition-[filter,box-shadow] duration-200',
                'hover:z-20 hover:brightness-105 hover:shadow-lifted',
                'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
                isNew ? 'animate-heart-beat' : 'animate-pop-in',
              ].join(' ')}
            />
          )
        })}

        {!loading && notes.length === 0 && (
          <p className="absolute inset-x-0 top-[38%] px-8 text-center font-hand text-2xl text-ink-faint">
            the branches are bare —
            <br />
            leave the first note ✨
          </p>
        )}
      </div>

      <p className="mt-1 font-hand text-2xl text-ink-faint">
        {loading
          ? 'looking at the branches…'
          : notes.length === 0
            ? 'nothing here yet'
            : `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} on the tree`}
        {notes.length > MAX_LEAVES && ` · showing the newest ${MAX_LEAVES}`}
      </p>

      {/* ---- leave a note ---- */}
      <div className="mt-5 w-full max-w-md">
        {!composing ? (
          <div className="flex justify-center">
            <DoodleButton
              variant="sage"
              onClick={() => {
                setComposing(true)
                setSaveError(null)
                setTimeout(() => inputRef.current?.focus(), 60)
              }}
            >
              + Leave a Note
            </DoodleButton>
          </div>
        ) : (
          <div className="animate-pop-in rounded-card border-[2.5px] border-ink/70 bg-paper p-4 shadow-sketch-lg">
            <label htmlFor="tree-note" className="font-hand text-2xl text-ink">
              What do you want to leave for me?
            </label>
            <textarea
              id="tree-note"
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
              maxLength={400}
              placeholder="Anything at all…"
              className="mt-2 w-full resize-none rounded-pebble border-2 border-ink/40 bg-paper-deep px-3 py-2 font-body text-base text-ink placeholder:text-ink-faint/70 focus:border-ink/70 focus:outline-none"
            />

            <div className="mt-1 flex items-center justify-between">
              <span className="font-body text-xs text-ink-faint">{draft.length}/400</span>
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
              <DoodleButton
                size="sm"
                variant="blush"
                onClick={handleSave}
                disabled={!draft.trim() || saving}
              >
                {saving ? 'hanging…' : 'Save'}
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

      {open && <NoteModal note={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** The tree itself: pot, curving trunk, and the branches ANCHORS sits on. */
function TreeArt() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="A small bare tree in a pot"
    >
      <g stroke="#3C3A38" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* trunk */}
        <path
          d="M198 318 C 192 296, 184 280, 196 258 C 206 240, 200 224, 194 206 C 190 194, 190 186, 192 176"
          strokeWidth="9"
        />
        {/* lower branches */}
        <path d="M190 268 C 168 258, 148 254, 128 240" strokeWidth="5.5" />
        <path d="M150 255 C 142 240, 136 230, 126 218" strokeWidth="4" />
        <path d="M196 244 C 220 236, 242 234, 264 222" strokeWidth="5.5" />
        <path d="M238 235 C 248 220, 256 210, 268 198" strokeWidth="4" />
        {/* upper branches */}
        <path d="M193 206 C 178 196, 166 188, 152 178" strokeWidth="4.5" />
        <path d="M193 212 C 210 204, 222 198, 236 188" strokeWidth="4.5" />
        {/* crown */}
        <path d="M192 176 C 184 162, 176 152, 166 142" strokeWidth="4" />
        <path d="M192 176 C 202 164, 212 156, 224 148" strokeWidth="4" />
        <path d="M166 142 C 158 134, 152 130, 144 124" strokeWidth="3" />
        <path d="M224 148 C 232 140, 240 136, 250 130" strokeWidth="3" />

        {/* the pot */}
        <path d="M138 338 L262 338 L246 386 L154 386 Z" strokeWidth="5" fill="#DFA98E" fillOpacity="0.5" />
        <rect x="128" y="316" width="144" height="22" rx="7" strokeWidth="5" fill="#DFA98E" fillOpacity="0.7" />
        <path d="M160 386 v6 M240 386 v6" strokeWidth="4" />
        {/* soil */}
        <path d="M142 328 q28 -6 58 0 q28 6 58 0" strokeWidth="3" opacity="0.45" />
      </g>
    </svg>
  )
}

/** The full note, opened up. */
function NoteModal({ note, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const spot = placeLeaf(note.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-5 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="A note from the tree"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: spot.color }}
        className="relative w-full max-w-md animate-note-unfold rounded-card border-[3px] border-ink/75 px-6 py-10 text-center shadow-lifted sm:px-10"
      >
        <span className="washi -top-3 left-1/2 -translate-x-1/2 -rotate-3 bg-paper/80" />

        <p className="whitespace-pre-wrap font-hand text-3xl leading-snug text-ink sm:text-4xl">
          {note.message}
        </p>

        <p className="mt-6 font-hand text-xl text-ink/60">{formatWhen(note.createdAt)}</p>

        <div className="mt-6">
          <DoodleButton size="sm" variant="ghost" alt onClick={onClose}>
            back to the tree
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}
