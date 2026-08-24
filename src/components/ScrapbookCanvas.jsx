import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'
import { asset } from '../utils/assets'
import {
  addScrapbookItem,
  fetchScrapbookItems,
  moveScrapbookItem,
  removeScrapbookItem,
  subscribeToScrapbook,
} from '../lib/supabase'

/* ---------------------------------------------------------------------------
 * The shared scrapbook.
 *
 * Positions live in a fixed 1200x900 board space, not in screen pixels, and
 * the whole board is scaled to whatever room the viewport has. That is the
 * detail that makes a *shared* board work: store screen coordinates instead
 * and a note she tucks beside a photo on a 768px iPad lands somewhere else
 * entirely on a 1440px laptop. One coordinate space, one arrangement, both of
 * us looking at the same page.
 * ------------------------------------------------------------------------- */

const BOARD_W = 1200
const BOARD_H = 900

/* Roughly how big each kind of thing is, in board units. Used for clamping so
 * nothing can be dragged off the edge and lost. */
const SIZES = {
  photo: { w: 200, h: 232 },
  note: { w: 180, h: 150 },
  sticker: { w: 78, h: 78 },
}

const NOTE_COLORS = ['#F7E6AC', '#F6C7CE', '#C7D8C0', '#C5DEEA', '#DACDE9', '#F8D3B8']

const STICKERS = ['heart', 'star', 'tape', 'sparkle', 'leaf']

const randomTilt = () => Math.round((Math.random() * 16 - 8) * 100) / 100

export default function ScrapbookCanvas({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [scale, setScale] = useState(1)

  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickingSticker, setPickingSticker] = useState(false)
  const [toast, setToast] = useState(null)

  const wrapRef = useRef(null)
  const boardRef = useRef(null)
  const inputRef = useRef(null)
  const dragRef = useRef(null)
  const toastTimer = useRef(null)
  // Read inside pointer handlers, which would otherwise close over a stale
  // scale from the render where the drag began.
  const scaleRef = useRef(1)

  scaleRef.current = scale

  const flashToast = useCallback((message) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), [])

  /* ---- fit the board to whatever space we have ------------------------- */
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined

    const fit = () => {
      const available = wrap.clientWidth
      // Never scale past 1:1 — a blown-up board just looks soft.
      setScale(Math.min(1, available / BOARD_W))
    }
    fit()

    const observer = new ResizeObserver(fit)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  /* ---- load, then listen ----------------------------------------------- */
  useEffect(() => {
    let cancelled = false
    fetchScrapbookItems().then((rows) => {
      if (cancelled) return
      setItems(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  /* Refetch whenever the board comes back into view.
   *
   * Realtime push only works once the table is added to the
   * `supabase_realtime` publication, and it is easy to forget that step. This
   * covers the common case regardless: come back to the tab, or unlock the
   * iPad, and you see whatever the other person left. One query per focus,
   * not a polling loop. Anything mid-drag is left alone. */
  useEffect(() => {
    const resync = async () => {
      if (document.visibilityState === 'hidden' || dragRef.current) return
      const rows = await fetchScrapbookItems()
      setItems((current) => {
        const held = dragRef.current?.id
        if (!held) return rows
        const mine = current.find((i) => i.id === held)
        return mine ? rows.map((r) => (r.id === held ? mine : r)) : rows
      })
    }

    window.addEventListener('focus', resync)
    document.addEventListener('visibilitychange', resync)
    return () => {
      window.removeEventListener('focus', resync)
      document.removeEventListener('visibilitychange', resync)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToScrapbook((change) => {
      setItems((current) => {
        if (change.kind === 'delete') return current.filter((i) => i.id !== change.id)

        const incoming = change.item
        // Never let a remote update yank something out from under her hand.
        if (dragRef.current?.id === incoming.id) return current

        const exists = current.some((i) => i.id === incoming.id)
        return exists
          ? current.map((i) => (i.id === incoming.id ? incoming : i))
          : [...current, incoming]
      })
    })
    return unsubscribe
  }, [])

  const topZ = items.reduce((max, i) => Math.max(max, i.z), 0)

  /* ---- dragging --------------------------------------------------------- */
  const toBoard = useCallback((clientX, clientY) => {
    const rect = boardRef.current.getBoundingClientRect()
    const s = scaleRef.current || 1
    return { x: (clientX - rect.left) / s, y: (clientY - rect.top) / s }
  }, [])

  const handlePointerDown = useCallback(
    (event, item) => {
      event.preventDefault()
      event.stopPropagation()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        /* nothing to capture */
      }

      const point = toBoard(event.clientX, event.clientY)
      const lifted = topZ + 1

      dragRef.current = {
        id: item.id,
        pointerId: event.pointerId,
        grabX: point.x - item.x,
        grabY: point.y - item.y,
        travelled: 0,
        z: lifted,
      }

      // Lift to the top of the stack the moment it is picked up.
      setItems((current) => current.map((i) => (i.id === item.id ? { ...i, z: lifted } : i)))
      setSelected(item.id)
    },
    [toBoard, topZ],
  )

  const handlePointerMove = useCallback(
    (event) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      event.preventDefault()

      const point = toBoard(event.clientX, event.clientY)
      const size = SIZES[itemTypeOf(items, drag.id)] || SIZES.sticker

      // Keep at least a third of the thing on the page, so nothing can be
      // shoved over the edge and become unreachable.
      const nextX = clamp(point.x - drag.grabX, -size.w / 3, BOARD_W - size.w * 0.66)
      const nextY = clamp(point.y - drag.grabY, -size.h / 3, BOARD_H - size.h * 0.66)

      drag.travelled += 1
      drag.lastX = nextX
      drag.lastY = nextY

      setItems((current) =>
        current.map((i) => (i.id === drag.id ? { ...i, x: nextX, y: nextY } : i)),
      )
    },
    [items, toBoard],
  )

  const handlePointerUp = useCallback(
    async (event) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      dragRef.current = null

      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }

      // A tap that never moved is a selection, not a move — nothing to save.
      if (drag.travelled < 2 || drag.lastX == null) return

      const result = await moveScrapbookItem(drag.id, { x: drag.lastX, y: drag.lastY, z: drag.z })
      if (!result.ok) flashToast('Could not save that move — still here though.')
    },
    [flashToast],
  )

  /* ---- adding ----------------------------------------------------------- */
  const placeNew = useCallback(
    async (type, content) => {
      // Drop new things around the middle, so they never land under the
      // toolbar or exactly on top of the last one.
      const size = SIZES[type]
      const x = BOARD_W / 2 - size.w / 2 + (Math.random() * 260 - 130)
      const y = BOARD_H / 2 - size.h / 2 + (Math.random() * 200 - 100)

      const optimisticId = `pending-${Date.now()}`
      const draftItem = { id: optimisticId, type, content, x, y, rotation: randomTilt(), z: topZ + 1 }
      setItems((current) => [...current, draftItem])

      const result = await addScrapbookItem(draftItem)
      if (!result.ok) {
        setItems((current) => current.filter((i) => i.id !== optimisticId))
        flashToast(result.error)
        return
      }
      // Swap the placeholder for the real row, which carries the real id.
      setItems((current) => current.map((i) => (i.id === optimisticId ? result.item : i)))
      flashToast(type === 'note' ? 'Pinned to the board ✨' : 'Stuck it on ✨')
    },
    [topZ, flashToast],
  )

  const handleSaveNote = useCallback(async () => {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    await placeNew('note', text)
    setSaving(false)
    setDraft('')
    setComposing(false)
  }, [draft, saving, placeNew])

  const handleRemove = useCallback(
    async (id) => {
      const snapshot = items
      setItems((current) => current.filter((i) => i.id !== id))
      setSelected(null)
      const result = await removeScrapbookItem(id)
      if (!result.ok) {
        setItems(snapshot)
        flashToast('Could not remove that one.')
      }
    },
    [items, flashToast],
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-hand text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Our <span className="marker-underline">scrapbook</span> ✂️
          </h1>
          <p className="mt-1 font-hand text-xl text-ink-faint">
            {loading
              ? 'opening the album…'
              : items.length === 0
                ? 'a blank page — stick something on it'
                : 'drag anything anywhere. it saves itself.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="font-hand text-2xl text-ink-faint underline decoration-wavy underline-offset-4 transition-colors hover:text-ink"
        >
          ← back to the memories
        </button>
      </div>

      {/* ---- the board ---- */}
      <div ref={wrapRef} className="w-full" onPointerDown={() => setSelected(null)}>
        <div
          style={{ height: BOARD_H * scale }}
          className="relative w-full overflow-hidden rounded-card border-[3px] border-ink/70 bg-paper shadow-sketch-lg"
        >
          <div
            ref={boardRef}
            style={{
              width: BOARD_W,
              height: BOARD_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              // A faint dot grid, like graph paper under everything.
              backgroundImage:
                'radial-gradient(rgba(60,58,56,0.14) 1.4px, transparent 1.4px)',
              backgroundSize: '28px 28px',
            }}
            className="absolute left-0 top-0"
          >
            {items.map((item) => (
              <BoardItem
                key={item.id}
                item={item}
                selected={selected === item.id}
                dragging={dragRef.current?.id === item.id}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onRemove={handleRemove}
              />
            ))}

            {!loading && items.length === 0 && (
              <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center font-hand text-4xl text-ink-faint">
                nothing here yet — add a note or a sticker below ✨
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---- toolbar ---- */}
      <div className="safe-bottom sticky bottom-0 z-30 mt-3 pt-2">
        <div className="rounded-card border-[2.5px] border-ink/70 bg-paper/95 p-3 shadow-sketch-lg backdrop-blur-sm">
          {composing ? (
            <div className="animate-pop-in">
              <label htmlFor="scrap-note" className="font-hand text-2xl text-ink">
                What should it say?
              </label>
              <textarea
                id="scrap-note"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveNote()
                  }
                  if (e.key === 'Escape') setComposing(false)
                }}
                rows={2}
                maxLength={160}
                placeholder="a few words…"
                className="mt-2 w-full resize-none rounded-pebble border-2 border-ink/40 bg-paper-deep px-3 py-2 font-body text-base text-ink placeholder:text-ink-faint/70 focus:border-ink/70 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className="mr-auto font-body text-xs text-ink-faint">{draft.length}/160</span>
                <DoodleButton size="sm" variant="ghost" onClick={() => setComposing(false)}>
                  never mind
                </DoodleButton>
                <DoodleButton
                  size="sm"
                  variant="blush"
                  onClick={handleSaveNote}
                  disabled={!draft.trim() || saving}
                >
                  {saving ? 'pinning…' : 'Pin it'}
                </DoodleButton>
              </div>
            </div>
          ) : pickingSticker ? (
            <div className="flex animate-pop-in flex-wrap items-center gap-2">
              <span className="font-hand text-2xl text-ink">pick one —</span>
              {STICKERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    placeNew('sticker', name)
                    setPickingSticker(false)
                  }}
                  aria-label={`Add a ${name} sticker`}
                  className="flex h-14 w-14 items-center justify-center rounded-pebble border-2 border-ink/35 bg-paper press-soft hover:border-ink/70 focus:outline-none focus-visible:ring-4 focus-visible:ring-butter"
                >
                  <Sticker name={name} className="h-9 w-9" />
                </button>
              ))}
              <DoodleButton
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => setPickingSticker(false)}
              >
                close
              </DoodleButton>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <DoodleButton
                size="sm"
                variant="butter"
                onClick={() => {
                  setComposing(true)
                  setPickingSticker(false)
                  setTimeout(() => inputRef.current?.focus(), 60)
                }}
              >
                + Add Note
              </DoodleButton>
              <DoodleButton
                size="sm"
                variant="sage"
                alt
                onClick={() => {
                  setPickingSticker(true)
                  setComposing(false)
                }}
              >
                + Add Sticker
              </DoodleButton>
              <span className="ml-auto font-hand text-xl text-ink-faint">
                {items.length} {items.length === 1 ? 'thing' : 'things'} on the page
                {selected && ' · tap the ✕ to remove'}
              </span>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-28 left-1/2 z-50 -translate-x-1/2 animate-pop-in rounded-doodle border-[2.5px] border-sage-deep bg-sage-soft px-6 py-3 font-hand text-2xl text-ink shadow-lifted">
          {toast}
        </div>
      )}
    </div>
  )
}

function itemTypeOf(items, id) {
  return items.find((i) => i.id === id)?.type
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/** One draggable thing on the page. */
function BoardItem({ item, selected, dragging, onPointerDown, onPointerMove, onPointerUp, onRemove }) {
  const size = SIZES[item.type] || SIZES.sticker

  return (
    <div
      style={{
        left: item.x,
        top: item.y,
        width: size.w,
        zIndex: item.z,
        transform: `rotate(${item.rotation}deg)${dragging ? ' scale(1.04)' : ''}`,
      }}
      onPointerDown={(e) => onPointerDown(e, item)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={[
        'absolute no-touch-scroll cursor-grab active:cursor-grabbing',
        'transition-shadow duration-150',
        dragging ? 'shadow-lifted' : 'shadow-sketch',
        selected ? 'ring-2 ring-blush-deep ring-offset-2 ring-offset-transparent' : '',
      ].join(' ')}
    >
      {item.type === 'photo' && <Polaroid item={item} />}
      {item.type === 'note' && <StickyNote item={item} />}
      {item.type === 'sticker' && <Sticker name={item.content} className="h-full w-full" />}

      {selected && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(item.id)
          }}
          aria-label="Remove this from the board"
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink/70 bg-paper font-body text-sm text-ink shadow-sketch hover:bg-blush-soft"
        >
          ✕
        </button>
      )}
    </div>
  )
}

/**
 * A photo, in a polaroid frame. `content` is the image URL.
 *
 * Run through asset() so a row can say either `images/us.jpg` or a full
 * https:// URL and both land correctly — a bare relative path would otherwise
 * resolve against whatever the current document URL happens to be.
 */
function Polaroid({ item }) {
  return (
    <div className="select-none bg-white p-2.5 pb-8">
      <img
        src={asset(item.content)}
        alt=""
        draggable="false"
        className="pointer-events-none block aspect-square w-full select-none bg-paper-deep object-cover"
      />
    </div>
  )
}

/** A torn-off square of paper with something written on it. */
function StickyNote({ item }) {
  // Colour is picked from the text so it stays the same on every device,
  // without needing a colour column in the table.
  const index = [...String(item.content)].reduce((sum, c) => sum + c.charCodeAt(0), 0) % NOTE_COLORS.length

  return (
    <div
      style={{ backgroundColor: NOTE_COLORS[index] }}
      className="select-none rounded-[3px] px-4 py-3.5"
    >
      <p className="whitespace-pre-wrap break-words font-hand text-2xl leading-tight text-ink">
        {item.content}
      </p>
    </div>
  )
}

/** The hand-drawn stickers. */
function Sticker({ name, className = '' }) {
  const common = {
    className: `${className} select-none pointer-events-none`,
    viewBox: '0 0 64 64',
    role: 'img',
    'aria-label': `${name} sticker`,
  }
  const ink = { stroke: '#3C3A38', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }

  switch (name) {
    case 'star':
      return (
        <svg {...common}>
          <path
            d="M32 6 L39 24 L58 26 L44 39 L48 58 L32 48 L16 58 L20 39 L6 26 L25 24 Z"
            fill="#F7E6AC"
            {...ink}
          />
        </svg>
      )
    case 'tape':
      return (
        <svg {...common}>
          <path d="M4 24 L60 18 L60 44 L4 50 Z" fill="#C5DEEA" fillOpacity="0.85" {...ink} />
          <path d="M4 24 l8 26 M20 22 l8 26 M36 20 l8 26 M52 19 l8 25" {...ink} strokeWidth="1.6" opacity="0.55" />
        </svg>
      )
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M32 4 C34 22, 42 30, 60 32 C42 34, 34 42, 32 60 C30 42, 22 34, 4 32 C22 30, 30 22, 32 4 Z" fill="#DACDE9" {...ink} />
        </svg>
      )
    case 'leaf':
      return (
        <svg {...common}>
          <path d="M32 58 C8 44, 10 14, 32 6 C54 14, 56 44, 32 58 Z" fill="#C7D8C0" {...ink} />
          <path d="M32 12 V54" {...ink} strokeWidth="2.2" />
        </svg>
      )
    case 'heart':
    default:
      return (
        <svg {...common}>
          <path
            d="M32 56 C4 38, 6 14, 20 12 C27 11, 31 16, 32 20 C33 16, 37 11, 44 12 C58 14, 60 38, 32 56 Z"
            fill="#F6C7CE"
            {...ink}
          />
        </svg>
      )
  }
}
