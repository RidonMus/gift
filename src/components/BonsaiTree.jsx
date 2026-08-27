import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'
import { addTreeNote, fetchTreeNotes } from '../lib/supabase'
import { useStickyState } from '../hooks/useStickyState'

/* ---------------------------------------------------------------------------
 * The note tree.
 *
 * Two ideas hold this together.
 *
 * Placement: hashing an id straight into an (x, y) would scatter notes into
 * empty air, because nothing in the hash knows where the branches are. So the
 * hash picks from ANCHORS — points sampled along the branch curves — and
 * jitters a little around that. Notes always land on wood, and since every
 * step is driven by the id, a note keeps its spot forever.
 *
 * Growth: the tree gets bigger as notes accumulate, but it never gains or
 * loses branches. That is deliberate. If low stages had fewer branches, the
 * anchor list would shrink, every existing note would jump somewhere new each
 * time the tree levelled up, and the one promise this screen makes — your note
 * stays where you left it — would break. Instead the whole tree scales about
 * the pot, and anchors scale with it, so a note keeps the same spot *on the
 * tree* while the tree itself grows underneath it.
 * ------------------------------------------------------------------------- */

/* Sampled along the branch paths in <TreeArt/>, in its 400x400 coordinates. */
const ANCHORS = [
  [174, 260], [158, 255], [144, 249], [132, 243],
  [146, 246], [139, 234], [130, 223],
  [214, 239], [232, 236], [248, 231], [261, 224],
  [245, 224], [253, 213], [264, 202],
  [183, 200], [172, 193], [160, 185],
  [205, 206], [217, 200], [230, 192],
  [186, 166], [179, 156], [170, 146], [159, 136], [150, 129],
  [199, 166], [208, 158], [218, 151], [232, 142], [243, 134],
  [196, 300], [190, 282], [196, 250], [200, 228],
]

/* The tree grows from its pot, so everything scales about this point. */
const ROOT = { x: 200, y: 386 }

/* Milestones. Each one is a thing she did not know was coming. */
const STAGES = [
  { at: 0, scale: 0.52, name: 'a bare little thing', blurb: 'leave the first note ✨' },
  { at: 1, scale: 0.62, name: 'a sprout', blurb: 'it has started' },
  { at: 3, scale: 0.72, name: 'a sapling', blurb: 'it is taking' },
  { at: 6, scale: 0.82, name: 'a young tree', blurb: 'fireflies at 9' },
  { at: 9, scale: 0.9, name: 'properly growing', blurb: 'a bird might nest at 12' },
  { at: 12, scale: 0.96, name: 'full and leafy', blurb: 'blossoms at 15' },
  { at: 15, scale: 1, name: 'in full bloom', blurb: 'and a cat at 18 🐈' },
  { at: 18, scale: 1, name: 'an old friend', blurb: 'look what we made' },
]

const UNLOCKS = { fireflies: 9, bird: 12, blossoms: 15, cat: 18 }

/* Tag colours. Once notes carry an author these split warm/cool so you can
 * tell at a glance whose handwriting is whose. */
const PALETTE = {
  hers: ['#F6C7CE', '#F8D3B8', '#F7E6AC', '#EFC978'],
  his: ['#C5DEEA', '#C7D8C0', '#DACDE9', '#C9E4D8'],
  either: ['#F6C7CE', '#F7E6AC', '#C7D8C0', '#C5DEEA', '#DACDE9', '#F8D3B8', '#C9E4D8'],
}

const MAX_LEAVES = 60
const HER_ZONE = 'Asia/Tashkent'

/* ---- deterministic helpers -------------------------------------------- */

function hashId(id) {
  const text = String(id)
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

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
 * Everything about how one note hangs: which branch, what kind of leaf, what
 * colour, how crooked, and how fast it sways. All from the id, so her iPad and
 * his laptop draw an identical tree.
 */
function placeLeaf(note, { scale, firstOfDay }) {
  const random = seeded(hashId(note.id))
  const [ax, ay] = ANCHORS[Math.floor(random() * ANCHORS.length)]
  const jitterX = (random() - 0.5) * 13
  const jitterY = (random() - 0.5) * 13
  const tilt = (random() - 0.5) * 22
  const roll = random()
  const swayDelay = random() * 4
  const swayDuration = 3.4 + random() * 2.4

  // Grow the anchor outward from the pot by the current stage's scale.
  const sx = ROOT.x + (ax + jitterX - ROOT.x) * scale
  const sy = ROOT.y + (ay + jitterY - ROOT.y) * scale

  let kind = 'leaf'
  if (roll < 0.05) kind = 'gold'
  else if (roll < 0.11) kind = 'crane'
  else if (firstOfDay) kind = 'flower'
  else if (roll < 0.2) kind = 'blossom'

  const side = note.author === 'Nodir' ? 'his' : note.author === 'Zukhra' ? 'hers' : 'either'
  const swatches = PALETTE[side]
  const color = swatches[Math.floor(random() * swatches.length)]

  return {
    left: sx / 4,
    top: sy / 4,
    tilt,
    color,
    kind,
    swayDelay,
    swayDuration,
    rare: kind === 'gold' || kind === 'crane',
  }
}

/* ---- her sky ------------------------------------------------------------ */

/** Season and hour where *she* is, so the tree matches the window beside her. */
function readHerSky() {
  const now = new Date()
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: HER_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(now),
  )
  const month = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: HER_ZONE, month: 'numeric' }).format(now),
  )

  const season =
    month >= 3 && month <= 5
      ? 'spring'
      : month >= 6 && month <= 8
        ? 'summer'
        : month >= 9 && month <= 11
          ? 'autumn'
          : 'winter'

  const phase = hour >= 5 && hour < 8 ? 'dawn' : hour >= 8 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night'

  return { season, phase, hour }
}

const SKIES = {
  dawn: 'linear-gradient(180deg, #FBE3D6 0%, #FBF4EC 62%, #FBF9F5 100%)',
  day: 'linear-gradient(180deg, #DEEEF6 0%, #EFF6F9 60%, #FBF9F5 100%)',
  dusk: 'linear-gradient(180deg, #F6D5BE 0%, #E6D6E6 55%, #FBF9F5 100%)',
  night: 'linear-gradient(180deg, #B7C3DC 0%, #D3DBEA 55%, #F0F1F6 100%)',
}

const SEASONS = {
  spring: { foliage: ['#F6C7CE', '#FAE3E6', '#C7D8C0'], label: 'spring in Tashkent 🌸' },
  summer: { foliage: ['#8FB08A', '#A6C0A0', '#C7D8C0'], label: 'summer in Tashkent ☀️' },
  autumn: { foliage: ['#E0A96D', '#D08C5A', '#EFC978'], label: 'autumn in Tashkent 🍂' },
  winter: { foliage: ['#D8E2EC', '#E8EEF4', '#C5DEEA'], label: 'winter in Tashkent ❄️' },
}

/* ---- dates -------------------------------------------------------------- */

const dayKeyOf = (iso) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: HER_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

function isTodayInLocal(iso) {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false

  const today = new Date()
  const isLocalToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  const isTashkentToday = dayKeyOf(iso) === dayKeyOf(today.toISOString())
  return isLocalToday || isTashkentToday
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

/* ========================================================================= */

export default function BonsaiTree({ onBack }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)
  const [shaking, setShaking] = useState(false)
  const [fluttering, setFluttering] = useState(null)

  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [toast, setToast] = useState(null)
  const [celebrating, setCelebrating] = useState(null)

  // Who is at this device. Asked once, then remembered.
  const [author, setAuthor] = useStickyState('cozy:treeAuthor', null)

  const [sky, setSky] = useState(() => readHerSky())

  const inputRef = useRef(null)
  const toastTimer = useRef(null)
  const shakeTimer = useRef(null)
  const justAdded = useRef(null)
  const lastStage = useRef(null)

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

  // Her sky moves on without us; check back every few minutes.
  useEffect(() => {
    const id = setInterval(() => setSky(readHerSky()), 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
    },
    [],
  )

  const flashToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  /* ---- growth ---------------------------------------------------------- */
  const stageIndex = STAGES.reduce((best, s, i) => (notes.length >= s.at ? i : best), 0)
  const stage = STAGES[stageIndex]

  // Announce a new stage, but never on first paint — arriving at a tree that
  // is already big should not fire a "look, it grew!" that did not happen.
  useEffect(() => {
    if (loading) return
    if (lastStage.current === null) {
      lastStage.current = stageIndex
      return
    }
    if (stageIndex > lastStage.current) {
      lastStage.current = stageIndex
      setCelebrating(STAGES[stageIndex])
      setTimeout(() => setCelebrating(null), 4200)
    }
  }, [stageIndex, loading])

  /* ---- which notes opened their day ------------------------------------ */
  const firstOfDayIds = useMemo(() => {
    const earliest = new Map()
    for (const note of notes) {
      const key = dayKeyOf(note.createdAt)
      const seen = earliest.get(key)
      if (!seen || new Date(note.createdAt) < new Date(seen.createdAt)) earliest.set(key, note)
    }
    return new Set([...earliest.values()].map((n) => n.id))
  }, [notes])

  /* ---- writing --------------------------------------------------------- */
  const handleSave = useCallback(async () => {
    const text = draft.trim()
    if (!text || saving) return

    setSaving(true)
    setSaveError(null)
    const result = await addTreeNote(text, author)
    setSaving(false)

    if (!result.ok) {
      setSaveError(result.error)
      return
    }

    justAdded.current = result.note.id
    setNotes((current) => [result.note, ...current])
    setDraft('')
    setComposing(false)

    const spot = placeLeaf(result.note, { scale: stage.scale, firstOfDay: true })
    flashToast(
      spot.kind === 'gold'
        ? 'A golden leaf! Those are rare ✨'
        : spot.kind === 'crane'
          ? 'A paper crane 🕊️'
          : 'Hung on the tree ✨',
    )
  }, [draft, saving, author, stage.scale, flashToast])

  /* ---- shaking --------------------------------------------------------- */
  const handleShake = useCallback(() => {
    if (shaking || notes.length === 0) return

    setShaking(true)
    const picked = notes[Math.floor(Math.random() * notes.length)]

    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => {
      setShaking(false)
      setFluttering(picked)
    }, 900)
  }, [shaking, notes])

  const visible = notes.slice(0, MAX_LEAVES)
  const season = SEASONS[sky.season]
  const nextStage = STAGES[stageIndex + 1]
  const todaysNotes = useMemo(
    () =>
      notes
        .filter((note) => isTodayInLocal(note.createdAt))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [notes],
  )

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
        <p className="mx-auto mt-2 max-w-md font-body text-base leading-relaxed text-ink-soft">
          Leave a note and it grows a leaf. Tap a leaf to read one — or shake the trunk and let the
          tree pick.
        </p>
      </div>

      {/* ---- the tree ---- */}
      <div
        className="relative mt-4 aspect-square w-full max-w-[min(100%,30rem,60vh)] overflow-hidden rounded-card border-[2.5px] border-ink/25"
        style={{ background: SKIES[sky.phase] }}
      >
        {sky.phase === 'night' && <Stars />}
        {sky.season === 'winter' && <Snow />}
        {notes.length >= UNLOCKS.fireflies && sky.phase === 'night' && <Fireflies />}

        {/* top header: season badge & today's note(s) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2.5">
          <div className="rounded-pebble border border-ink/20 bg-paper/85 px-2 py-0.5 font-hand text-xs leading-tight text-ink-soft shadow-xs backdrop-blur-sm sm:text-sm">
            {season.label}
          </div>

          {todaysNotes.length > 0 && !open && !fluttering && (
            <div className="pointer-events-auto flex max-w-[62%] flex-wrap items-center justify-end gap-1.5">
              {todaysNotes.map((note, idx) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setOpen(note)}
                  className="rounded-pebble border-[1.5px] border-butter-deep bg-butter-soft/95 px-2.5 py-1 font-hand text-xs text-ink shadow-sketch transition-all hover:scale-105 active:scale-95 sm:text-sm"
                >
                  {todaysNotes.length === 1
                    ? 'Today’s note ✨'
                    : `Today’s note ${note.author ? `(${note.author})` : `#${idx + 1}`} ✨`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={shaking ? 'h-full w-full origin-bottom animate-tree-rock' : 'h-full w-full'}>
          <TreeArt
            scale={stage.scale}
            season={season}
            stageIndex={stageIndex}
            noteCount={notes.length}
            onShake={handleShake}
          />

          {visible.map((note, i) => {
            const spot = placeLeaf(note, {
              scale: stage.scale,
              firstOfDay: firstOfDayIds.has(note.id),
            })
            const isNew = justAdded.current === note.id
            const isTodayNote = isTodayInLocal(note.createdAt)
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
                  animationDelay: isNew ? '0ms' : `${spot.swayDelay}s`,
                  animationDuration: `${spot.swayDuration}s`,
                }}
                className={[
                  'absolute z-10 origin-top -translate-x-1/2 focus:outline-none',
                  'focus-visible:ring-4 focus-visible:ring-butter',
                  isNew ? 'animate-grow-in' : 'animate-leaf-sway',
                  isTodayNote ? 'animate-pulse ring-2 ring-butter/80 drop-shadow-[0_0_10px_rgba(246,227,168,0.8)]' : '',
                ].join(' ')}
              >
                <Leaf spot={spot} />
              </button>
            )
          })}
        </div>

        {!loading && notes.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-[30%] px-8 text-center font-hand text-2xl text-ink-faint">
            the branches are bare —
            <br />
            leave the first note ✨
          </p>
        )}

        {shaking && <Petals season={season} />}
      </div>

      {/* ---- growth line ---- */}
      <div className="mt-2 w-full max-w-[30rem] text-center">
        <p className="font-hand text-2xl text-ink">
          {loading ? 'looking at the branches…' : stage.name}
          {!loading && notes.length > 0 && (
            <span className="text-ink-faint">
              {' '}
              · {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          )}
        </p>

        {!loading && nextStage && (
          <GrowthBar count={notes.length} from={stage.at} to={nextStage.at} hint={stage.blurb} />
        )}

        {/* Fully grown: no bar to show, but the tree should still say something. */}
        {!loading && !nextStage && (
          <p className="mt-1 font-hand text-lg text-sage-deep">{stage.blurb}</p>
        )}
      </div>

      {/* ---- actions ---- */}
      <div className="mt-4 w-full max-w-md">
        {!composing ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
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
            <DoodleButton variant="butter" alt onClick={handleShake} disabled={notes.length === 0 || shaking}>
              🍃 Shake the tree
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

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-hand text-xl text-ink-faint">from —</span>
              {['Nodir', 'Zukhra'].map((who) => (
                <button
                  key={who}
                  type="button"
                  onClick={() => setAuthor(who)}
                  className={[
                    'rounded-pebble border-2 px-3 py-1 font-hand text-xl leading-none press-soft',
                    author === who
                      ? 'border-ink bg-butter text-ink'
                      : 'border-ink/30 bg-paper text-ink-faint hover:border-ink/60',
                  ].join(' ')}
                >
                  {who}
                </button>
              ))}
              <span className="ml-auto font-body text-xs text-ink-faint">{draft.length}/400</span>
            </div>

            {saveError && <p className="mt-1 font-body text-xs text-blush-deep">{saveError}</p>}

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <DoodleButton size="sm" variant="ghost" onClick={() => setComposing(false)}>
                never mind
              </DoodleButton>
              <DoodleButton size="sm" variant="blush" onClick={handleSave} disabled={!draft.trim() || saving}>
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

      {celebrating && <GrowthCard stage={celebrating} onClose={() => setCelebrating(null)} />}

      {fluttering && (
        <NoteModal
          note={fluttering}
          shaken
          firstOfDay={firstOfDayIds.has(fluttering.id)}
          scale={stage.scale}
          onClose={() => setFluttering(null)}
        />
      )}

      {open && (
        <NoteModal
          note={open}
          firstOfDay={firstOfDayIds.has(open.id)}
          scale={stage.scale}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

/* ---- growth bar --------------------------------------------------------- */

function GrowthBar({ count, from, to, hint }) {
  const pct = Math.max(0, Math.min(100, ((count - from) / (to - from)) * 100))
  const left = to - count

  return (
    <div className="mt-1">
      <div className="mx-auto h-2.5 w-full max-w-[18rem] overflow-hidden rounded-full border-2 border-ink/25 bg-paper">
        <div
          className="h-full rounded-full bg-sage transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 font-hand text-lg text-ink-faint">
        {left > 0 ? `${left} more until it grows · ${hint}` : hint}
      </p>
    </div>
  )
}

/* ---- one hanging leaf --------------------------------------------------- */

function Leaf({ spot }) {
  const { kind, color, tilt, rare } = spot

  return (
    <span className="pointer-events-none flex flex-col items-center" style={{ transform: `rotate(${tilt}deg)` }}>
      {/* the string it hangs by */}
      <span className="block h-[7px] w-px bg-ink/45" />

      {kind === 'flower' ? (
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] drop-shadow-sm">
          <g stroke="#3C3A38" strokeWidth="1.6">
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2 - Math.PI / 2
              return (
                <circle key={i} cx={12 + Math.cos(a) * 5.5} cy={12 + Math.sin(a) * 5.5} r="4" fill={color} />
              )
            })}
            <circle cx="12" cy="12" r="3" fill="#F7E6AC" />
          </g>
        </svg>
      ) : kind === 'crane' ? (
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px] drop-shadow-sm">
          <g stroke="#3C3A38" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M3 13 L12 5 L21 13 L12 11 Z" fill="#FBF6EC" />
            <path d="M12 11 L12 19 L7 16 Z" fill="#E2EFF5" />
            <path d="M12 11 L18 18" />
          </g>
        </svg>
      ) : kind === 'gold' ? (
        <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] drop-shadow">
          <g stroke="#8A6A1F" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 3 C5 9, 5 18, 12 21 C19 18, 19 9, 12 3 Z" fill="#F2CE5B" />
            <path d="M12 5 V19" strokeWidth="1.2" />
          </g>
        </svg>
      ) : kind === 'blossom' ? (
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] drop-shadow-sm">
          <g stroke="#3C3A38" strokeWidth="1.5">
            <circle cx="9" cy="10" r="5" fill={color} />
            <circle cx="15" cy="12" r="4.5" fill={color} />
            <circle cx="11" cy="16" r="4" fill={color} />
          </g>
        </svg>
      ) : (
        /* the ordinary paper tag */
        <span
          className="block h-[17px] w-[15px] rounded-[2px] border border-ink/45 shadow-sketch"
          style={{ backgroundColor: color }}
        />
      )}

      {rare && (
        <span className="absolute -right-1.5 -top-1 text-[9px] leading-none" aria-hidden="true">
          ✨
        </span>
      )}
    </span>
  )
}

/* ---- the tree art ------------------------------------------------------- */

function TreeArt({ scale, season, stageIndex, noteCount, onShake }) {
  // Foliage fills in as the tree matures; the clusters are seeded so they do
  // not reshuffle on every render.
  const clusters = useMemo(() => {
    const random = seeded(1337)
    const count = Math.min(14, stageIndex * 2 + 2)
    return Array.from({ length: count }, () => ({
      cx: 120 + random() * 160,
      cy: 130 + random() * 130,
      r: 16 + random() * 20,
      tone: Math.floor(random() * 3),
      o: 0.5 + random() * 0.35,
    }))
  }, [stageIndex])

  const bare = season.label.includes('winter')

  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="A small tree in a pot"
    >
      <g transform={`translate(${ROOT.x} ${ROOT.y}) scale(${scale}) translate(${-ROOT.x} ${-ROOT.y})`}>
        {/* foliage behind the branches */}
        {!bare &&
          clusters.map((c, i) => (
            <circle
              key={i}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={season.foliage[c.tone]}
              opacity={c.o}
            />
          ))}

        <g stroke="#3C3A38" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path
            d="M198 318 C 192 296, 184 280, 196 258 C 206 240, 200 224, 194 206 C 190 194, 190 186, 192 176"
            strokeWidth="9"
          />
          <path d="M190 268 C 168 258, 148 254, 128 240" strokeWidth="5.5" />
          <path d="M150 255 C 142 240, 136 230, 126 218" strokeWidth="4" />
          <path d="M196 244 C 220 236, 242 234, 264 222" strokeWidth="5.5" />
          <path d="M238 235 C 248 220, 256 210, 268 198" strokeWidth="4" />
          <path d="M193 206 C 178 196, 166 188, 152 178" strokeWidth="4.5" />
          <path d="M193 212 C 210 204, 222 198, 236 188" strokeWidth="4.5" />
          <path d="M192 176 C 184 162, 176 152, 166 142" strokeWidth="4" />
          <path d="M192 176 C 202 164, 212 156, 224 148" strokeWidth="4" />
          <path d="M166 142 C 158 134, 152 130, 144 124" strokeWidth="3" />
          <path d="M224 148 C 232 140, 240 136, 250 130" strokeWidth="3" />
        </g>

        {/* blossoms, once the tree has earned them */}
        {noteCount >= UNLOCKS.blossoms &&
          [[150, 130], [244, 133], [130, 224], [266, 200], [193, 150]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill="#F6C7CE" stroke="#3C3A38" strokeWidth="1.6" />
              <circle cx={x} cy={y} r="2" fill="#F7E6AC" />
            </g>
          ))}

        {noteCount >= UNLOCKS.bird && <Bird />}
      </g>

      {/* the pot never scales — the tree grows out of it */}
      <g stroke="#3C3A38" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M138 338 L262 338 L246 386 L154 386 Z" strokeWidth="5" fill="#DFA98E" fillOpacity="0.55" />
        <rect x="128" y="316" width="144" height="22" rx="7" strokeWidth="5" fill="#DFA98E" fillOpacity="0.75" />
        <path d="M160 386 v6 M240 386 v6" strokeWidth="4" />
        <path d="M142 328 q28 -6 58 0 q28 6 58 0" strokeWidth="3" opacity="0.45" />
      </g>

      {noteCount >= UNLOCKS.cat && <Cat />}

      {/* the trunk is the shake handle */}
      <rect
        x="168"
        y="200"
        width="64"
        height="140"
        fill="transparent"
        className="cursor-pointer"
        onClick={onShake}
      >
        <title>Shake the tree</title>
      </rect>
    </svg>
  )
}

function Bird() {
  return (
    <g transform="translate(236 128)">
      <g stroke="#3C3A38" strokeWidth="2" strokeLinejoin="round">
        <ellipse cx="0" cy="0" rx="9" ry="7" fill="#C5DEEA" />
        <circle cx="7" cy="-5" r="5" fill="#C5DEEA" />
        <path d="M11 -6 l5 2 l-5 2 z" fill="#EFC978" />
        <path d="M-9 0 l-8 -4 l2 6 z" fill="#A9C7D8" />
        <path d="M5.5 -6.5 h.01" strokeWidth="2.4" />
      </g>
    </g>
  )
}

function Cat() {
  return (
    <g transform="translate(200 370)">
      <g stroke="#3C3A38" strokeWidth="2.4" strokeLinejoin="round">
        <ellipse cx="0" cy="6" rx="26" ry="12" fill="#F7E6AC" />
        <circle cx="-18" cy="-2" r="10" fill="#F7E6AC" />
        <path d="M-26 -8 L-28 -17 L-20 -12 Z" fill="#F7E6AC" />
        <path d="M-12 -11 L-9 -19 L-5 -11 Z" fill="#F7E6AC" />
        <path d="M-22 -3 q3 3 6 0" fill="none" strokeWidth="1.8" />
        <path d="M20 2 q10 -3 8 -11" fill="none" strokeWidth="2.6" />
      </g>
    </g>
  )
}

/* ---- weather & atmosphere ---------------------------------------------- */

function Stars() {
  const stars = useMemo(() => {
    const random = seeded(99)
    return Array.from({ length: 22 }, () => ({
      left: random() * 100,
      top: random() * 46,
      size: 1.5 + random() * 2,
      delay: random() * 3,
    }))
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute animate-pulse rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

function Fireflies() {
  const flies = useMemo(() => {
    const random = seeded(4242)
    return Array.from({ length: 9 }, () => ({
      left: 18 + random() * 64,
      top: 30 + random() * 46,
      delay: random() * 6,
      duration: 5 + random() * 4,
    }))
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {flies.map((f, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 animate-firefly-drift rounded-full bg-butter shadow-[0_0_8px_3px_rgba(246,227,168,0.85)]"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

function Snow() {
  const flakes = useMemo(() => {
    const random = seeded(7)
    return Array.from({ length: 16 }, () => ({
      left: random() * 100,
      delay: random() * 9,
      duration: 7 + random() * 6,
      size: 3 + random() * 3,
    }))
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 animate-snow-fall rounded-full bg-white"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Petals shaken loose from the branches. */
function Petals({ season }) {
  const petals = useMemo(() => {
    const random = seeded(Date.now() % 100000)
    return Array.from({ length: 12 }, () => ({
      left: 24 + random() * 52,
      top: 26 + random() * 34,
      drift: `${(random() - 0.5) * 90}px`,
      delay: random() * 0.35,
      tone: Math.floor(random() * 3),
    }))
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {petals.map((p, i) => (
        <span
          key={i}
          className="absolute h-2 w-2.5 animate-petal-fall rounded-[60%_40%_55%_45%]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            backgroundColor: season.foliage[p.tone],
            animationDelay: `${p.delay}s`,
            '--drift': p.drift,
          }}
        />
      ))}
    </div>
  )
}

/* ---- the milestone card ------------------------------------------------- */

function GrowthCard({ stage, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="The tree grew"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-pop-in rounded-card border-[3px] border-ink/75 bg-paper px-6 py-8 text-center shadow-lifted"
      >
        <p className="text-5xl">🌳</p>
        <h2 className="mt-3 font-hand text-4xl font-bold text-ink">The tree grew!</h2>
        <p className="mt-2 font-hand text-2xl text-sage-deep">It is {stage.name} now.</p>
        <p className="mt-2 font-body text-sm text-ink-soft">{stage.blurb}</p>
        <div className="mt-6">
          <DoodleButton size="sm" variant="sage" onClick={onClose}>
            lovely
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}

/* ---- reading a note ----------------------------------------------------- */

function NoteModal({ note, onClose, shaken = false, firstOfDay = false, scale = 1 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const spot = placeLeaf(note, { scale, firstOfDay })

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
        className={[
          'relative w-full max-w-sm rounded-card border-[3px] border-ink/75 px-6 py-8 text-center shadow-lifted sm:px-8',
          shaken ? 'animate-flutter-down' : 'animate-note-unfold',
        ].join(' ')}
      >
        <span className="washi -top-3 left-1/2 -translate-x-1/2 -rotate-3 bg-paper/80" />

        {shaken && (
          <p className="mb-3 font-hand text-xl text-ink/60">🍃 this one fluttered down</p>
        )}
        {spot.kind === 'gold' && <p className="mb-2 font-hand text-xl text-ink/60">a golden leaf ✨</p>}
        {spot.kind === 'flower' && (
          <p className="mb-2 font-hand text-xl text-ink/60">the first note of its day 🌸</p>
        )}

        <p className="whitespace-pre-wrap font-hand text-2xl leading-snug text-ink sm:text-3xl">
          {note.message}
        </p>

        <p className="mt-6 font-hand text-xl text-ink/60">
          {note.author ? `${note.author} · ` : ''}
          {formatWhen(note.createdAt)}
        </p>

        <div className="mt-6">
          <DoodleButton size="sm" variant="ghost" alt onClick={onClose}>
            back to the tree
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}
