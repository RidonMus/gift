import React, { useCallback, useEffect, useRef, useState } from 'react'
import ColorPalette, { PALETTE } from './ColorPalette'
import DoodleButton from './DoodleButton'
import { useLineArtSource, useVectorLineArt } from '../hooks/useArtwork'
import { useRasterLineArt } from '../hooks/useRasterLineArt'
import { useStickyState, useTransientMessage } from '../hooks/useStickyState'
import { tinyCheer } from '../utils/celebrate'
import { paintFillLayer } from '../utils/rasterRegions'

/* The canvas always thinks in a 1000x1000 space and is scaled by CSS, so
 * strokes look identical whether she is on a phone, an iPad, or a laptop.
 * Raster region-labeling is built at this same resolution — see
 * useRasterLineArt — so a tap coordinate and a region label always agree
 * without any rescaling. */
const CANVAS_SIZE = 1000
const MAX_HISTORY = 24
/* A very large drawing is not worth blowing the localStorage quota over. */
const STORE_LIMIT = 2_000_000

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })

const TOOL_HINTS = {
  fill: 'Tap any shape to flood it with colour. Tap it again with cream to undo.',
  brush: 'Draw with your finger or Pencil — press harder for a thicker line.',
  eraser: 'Rub out any brushwork. A single tap on a shape clears its fill.',
}

/**
 * Phase 3. The colouring book.
 *
 * The artboard is three stacked sheets plus an invisible input surface:
 *
 *   z0  paint layer — her flood fills, outlines removed
 *   z10 brush canvas — her strokes
 *   z20 ink layer   — the black outlines, nothing filled
 *   z30 overlay     — swallows every pointer, routes it to the active tool
 *
 * That order is what makes it feel like real colouring: brushwork covers the
 * fills, but the outlines stay crisp on top of both.
 *
 * The picture itself comes in two flavours. Hand-drawn art (built-in, or a
 * custom SVG someone authored) already has named `data-fill` shapes to tap.
 * A photo run through an outline filter does not — there is nothing but black
 * lines on a white JPEG — so for that case we find the shapes ourselves once,
 * up front, via useRasterLineArt, and tap-to-fill becomes "which label is
 * under this pixel" instead of "which SVG element is under this point".
 * Everything downstream of that (brushing, erasing, undo, saving) doesn't
 * care which kind of picture it's looking at.
 */
export default function ColoringScreen({ memory, onBack, artistName = 'Zukhra' }) {
  const fillsKey = `cozy:fills:${memory.id}`
  const strokesKey = `cozy:strokes:${memory.id}`

  const [fills, setFills] = useStickyState(fillsKey, {})
  const [tool, setTool] = useState('fill')
  const [color, setColor] = useState(PALETTE[0].hex)
  const [brushSize, setBrushSize] = useState(20)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedImage, setSavedImage] = useState(null)
  const [toast, showToast] = useTransientMessage()

  const source = useLineArtSource(memory)
  const vectorLayers = useVectorLineArt(memory, source, fills)
  const isRaster = source?.mode === 'raster-photo'
  const raster = useRasterLineArt(isRaster ? source.src : null, CANVAS_SIZE)
  const rasterReady = !isRaster || !!raster

  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const fillCanvasRef = useRef(null)
  const inkRef = useRef(null)
  const overlayRef = useRef(null)
  const gestureRef = useRef(null)
  const drawingRef = useRef(false)

  /* ---- canvas set-up, and bringing back last time's drawing ------------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctxRef.current = ctx

    let cancelled = false
    let stored = null
    try {
      stored = window.localStorage.getItem(strokesKey)
    } catch {
      /* private mode — start with a clean sheet */
    }
    if (stored) {
      loadImage(stored)
        .then((img) => {
          if (!cancelled) ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [strokesKey])

  /* ---- paint the raster fill layer whenever her colours (or the region
     map) change. Vector mode does this for free via dangerouslySetInnerHTML,
     since sceneFillLayer/withFills already bake `fills` into the markup. --- */
  useEffect(() => {
    if (!isRaster || !raster) return
    const canvas = fillCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    paintFillLayer(ctx, raster.regionMap, fills)
  }, [isRaster, raster, fills])

  const persistStrokes = useCallback(() => {
    try {
      const data = canvasRef.current.toDataURL('image/png')
      if (data.length < STORE_LIMIT) window.localStorage.setItem(strokesKey, data)
    } catch {
      /* Out of quota or private mode. The drawing still lives on screen. */
    }
  }, [strokesKey])

  /* ---- undo ------------------------------------------------------------- */
  const pushHistory = useCallback(() => {
    let strokes = null
    try {
      strokes = canvasRef.current.toDataURL('image/png')
    } catch {
      /* ignore */
    }
    setHistory((past) => [...past, { fills, strokes }].slice(-MAX_HISTORY))
  }, [fills])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const previous = history[history.length - 1]

    setHistory((past) => past.slice(0, -1))
    setFills(previous.fills)

    const ctx = ctxRef.current
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (previous.strokes) {
      loadImage(previous.strokes)
        .then((img) => {
          ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
          persistStrokes()
        })
        .catch(() => {})
    } else {
      persistStrokes()
    }
  }, [history, persistStrokes, setFills])

  const handleClear = useCallback(() => {
    pushHistory()
    const ctx = ctxRef.current
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    setFills({})
    try {
      window.localStorage.removeItem(strokesKey)
    } catch {
      /* ignore */
    }
    showToast('Clean page. Start wherever you like ✨')
  }, [pushHistory, setFills, strokesKey, showToast])

  /* ---- pointer plumbing -------------------------------------------------- */
  const toCanvas = useCallback((clientX, clientY) => {
    const rect = overlayRef.current.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((clientY - rect.top) / rect.height) * CANVAS_SIZE,
    }
  }, [])

  /**
   * Which fillable shape is under this screen point, if any.
   * Raster pictures look it up in the pre-built label map; hand-drawn ones
   * hit-test the actual SVG elements, which also hands back a nice label.
   */
  const regionAt = useCallback(
    (clientX, clientY) => {
      if (isRaster) {
        if (!raster) return null
        const p = toCanvas(clientX, clientY)
        const label = raster.regionMap.labelAt(p.x, p.y)
        return label ? { id: label, label: null } : null
      }
      const stack = document.elementsFromPoint(clientX, clientY)
      for (const el of stack) {
        if (el.hasAttribute?.('data-fill') && inkRef.current?.contains(el)) {
          return { id: el.getAttribute('data-fill'), label: el.getAttribute('data-label') }
        }
      }
      return null
    },
    [isRaster, raster, toCanvas],
  )

  /** Apple Pencil reports real pressure; everything else gets a sensible middle. */
  const widthFor = useCallback(
    (event) => {
      const raw = event.pressure
      const pressure = raw > 0.02 && raw < 0.999 ? raw : 0.5
      const scale = tool === 'eraser' ? 1.5 : 1
      return brushSize * scale * (0.62 + pressure * 0.85)
    },
    [brushSize, tool],
  )

  const handlePointerDown = useCallback(
    (event) => {
      if (!rasterReady) return
      event.preventDefault()
      // Capture keeps a stroke alive if her finger wanders off the artboard.
      // It throws if the pointer was already released, which is harmless.
      try {
        overlayRef.current.setPointerCapture(event.pointerId)
      } catch {
        /* nothing to capture */
      }

      const point = toCanvas(event.clientX, event.clientY)
      const region = regionAt(event.clientX, event.clientY)
      gestureRef.current = { pointerId: event.pointerId, last: point, lastMid: point, travelled: 0, region }

      if (tool === 'fill') {
        if (!region) {
          showToast('Nothing to fill just there — try inside a shape.')
          return
        }
        pushHistory()
        setFills((current) => ({ ...current, [region.id]: color }))
        showToast(region.label ? `${region.label} — coloured in ✨` : 'coloured in ✨')
        return
      }

      // brush + eraser both paint; only the composite operation differs
      pushHistory()
      drawingRef.current = true
      const ctx = ctxRef.current
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = widthFor(event)

      // a lone tap should still leave a dot
      ctx.beginPath()
      ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fill()
    },
    [color, pushHistory, regionAt, rasterReady, setFills, showToast, toCanvas, tool, widthFor],
  )

  const handlePointerMove = useCallback(
    (event) => {
      const gesture = gestureRef.current
      if (!drawingRef.current || !gesture || gesture.pointerId !== event.pointerId) return
      event.preventDefault()

      const ctx = ctxRef.current
      const native = event.nativeEvent
      // Coalesced events are what make a fast Pencil stroke smooth instead of
      // a string of straight segments.
      const samples = native.getCoalescedEvents ? native.getCoalescedEvents() : [native]

      for (const sample of samples.length ? samples : [native]) {
        const point = toCanvas(sample.clientX, sample.clientY)
        const mid = { x: (gesture.last.x + point.x) / 2, y: (gesture.last.y + point.y) / 2 }

        ctx.lineWidth = widthFor(sample)
        ctx.beginPath()
        ctx.moveTo(gesture.lastMid.x, gesture.lastMid.y)
        // Curving through the previous point keeps corners round, not spiky.
        ctx.quadraticCurveTo(gesture.last.x, gesture.last.y, mid.x, mid.y)
        ctx.stroke()

        gesture.travelled += Math.hypot(point.x - gesture.last.x, point.y - gesture.last.y)
        gesture.last = point
        gesture.lastMid = mid
      }
    },
    [toCanvas, widthFor],
  )

  const handlePointerUp = useCallback(
    (event) => {
      const gesture = gestureRef.current
      try {
        overlayRef.current?.releasePointerCapture(event.pointerId)
      } catch {
        /* already released */
      }

      if (drawingRef.current) {
        drawingRef.current = false
        ctxRef.current.globalCompositeOperation = 'source-over'
        persistStrokes()
      }

      // Tapping (rather than rubbing) with the eraser lifts a flood fill.
      if (tool === 'eraser' && gesture && gesture.travelled < 12 && gesture.region) {
        setFills((current) => {
          if (!current[gesture.region.id]) return current
          const next = { ...current }
          delete next[gesture.region.id]
          return next
        })
      }
      gestureRef.current = null
    },
    [persistStrokes, setFills, tool],
  )

  /* ---- saving ------------------------------------------------------------ */
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const ART = 1400
      const pad = 44
      const out = document.createElement('canvas')
      out.width = ART + pad * 2
      out.height = ART + pad + 132

      const ctx = out.getContext('2d')
      ctx.fillStyle = '#FBF9F5'
      ctx.fillRect(0, 0, out.width, out.height)

      if (isRaster && raster) {
        // Same three sheets as the screen, straight from the photo and the
        // canvas we already paint into — no SVG round-trip needed.
        ctx.drawImage(fillCanvasRef.current, pad, pad, ART, ART)
        ctx.drawImage(canvasRef.current, pad, pad, ART, ART)
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(raster.image, pad, pad, ART, ART)
        ctx.globalCompositeOperation = 'source-over'
      } else {
        const toUri = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        // Same three sheets, same order — and the same multiply blend for the
        // ink, so the exported PNG matches the screen exactly.
        ctx.drawImage(await loadImage(toUri(vectorLayers.fillLayer)), pad, pad, ART, ART)
        ctx.drawImage(canvasRef.current, pad, pad, ART, ART)
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(await loadImage(toUri(vectorLayers.inkLayer)), pad, pad, ART, ART)
        ctx.globalCompositeOperation = 'source-over'
      }

      try {
        await document.fonts.ready
      } catch {
        /* the fallback face is fine */
      }

      ctx.textAlign = 'center'
      ctx.fillStyle = '#3C3A38'
      ctx.font = '600 64px Caveat, cursive'
      ctx.fillText(memory.title, out.width / 2, ART + pad + 58)
      ctx.fillStyle = '#A29A93'
      ctx.font = '400 40px Caveat, cursive'
      ctx.fillText(`coloured by ${artistName} ❤`, out.width / 2, ART + pad + 108)

      setSavedImage(out.toDataURL('image/png'))
      tinyCheer()
    } catch {
      showToast('Saving hiccuped — give it one more tap?')
    } finally {
      setSaving(false)
    }
  }, [artistName, isRaster, raster, memory.title, showToast, vectorLayers])

  const filledCount = Object.keys(fills).length

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      {/* ---- header ---- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-hand text-4xl font-semibold leading-none text-ink sm:text-5xl">
            {memory.title}
          </h2>
          <p className="mt-1 font-hand text-xl text-ink-faint">
            {filledCount > 0 ? `${filledCount} shapes coloured so far` : 'a blank page, all yours'}
          </p>
        </div>
        <DoodleButton size="sm" variant="ghost" alt onClick={onBack}>
          ← the memory gallery
        </DoodleButton>
      </div>

      {/* ---- the artboard ---- */}
      {/* The vh cap matters on a landscape iPad: without it the square board
          pushes the palette off the bottom of the screen. */}
      <div className="relative mx-auto w-full max-w-[min(100%,34rem,58vh)]">
        {/* `isolate` keeps the ink layer's multiply blend inside the artboard
            instead of letting it darken the page behind it. */}
        <div className="relative isolate aspect-square w-full overflow-hidden rounded-card border-[3px] border-ink/75 bg-[#FEFCF8] shadow-sketch-lg">
          {isRaster ? (
            <canvas
              ref={fillCanvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            />
          ) : (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: vectorLayers.fillLayer }}
            />
          )}

          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          />

          {isRaster ? (
            // object-fill (stretch, not crop) so this lines up pixel-for-pixel
            // with buildRegionMap, which draws the same image the same way.
            <img
              src={source.src}
              alt=""
              aria-hidden="true"
              draggable="false"
              style={{ mixBlendMode: 'multiply' }}
              className="pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-fill"
            />
          ) : (
            <div
              ref={inkRef}
              aria-hidden="true"
              style={{ mixBlendMode: 'multiply' }}
              className="absolute inset-0 z-20 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: vectorLayers.inkLayer }}
            />
          )}

          <div
            ref={overlayRef}
            role="application"
            aria-label={`Colouring canvas for ${memory.title}`}
            className="absolute inset-0 z-30 no-touch-scroll cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />

          {!rasterReady && (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-40 flex items-center justify-center bg-paper/70 backdrop-blur-[2px]"
            >
              <p className="animate-pulse font-hand text-2xl text-ink-faint">
                getting your drawing ready ✨
              </p>
            </div>
          )}
        </div>

        {/* a small floating note about the active tool */}
        <p className="mt-2 min-h-[1.75rem] text-center font-hand text-xl text-ink-faint">
          {toast || TOOL_HINTS[tool]}
        </p>
      </div>

      {/* ---- palette ---- */}
      <div className="safe-bottom sticky bottom-0 z-20 mt-3 pt-2">
        <ColorPalette
          color={color}
          onColor={setColor}
          tool={tool}
          onTool={setTool}
          brushSize={brushSize}
          onBrushSize={setBrushSize}
          onUndo={handleUndo}
          canUndo={history.length > 0}
          onClear={handleClear}
          onSave={handleSave}
          saving={saving}
        />
      </div>

      {/* ---- the finished piece ---- */}
      {savedImage && (
        <SaveDialog
          image={savedImage}
          filename={`${memory.id}-coloured-by-${artistName.toLowerCase()}.png`}
          onClose={() => setSavedImage(null)}
        />
      )}
    </div>
  )
}

/**
 * Shown after "Save Masterpiece".
 *
 * Both routes to keeping the picture are offered on purpose: the download
 * button covers desktop, and press-and-hold covers iPadOS, where a download
 * link is fiddlier than just saving the image to Photos.
 */
function SaveDialog({ image, filename, onClose }) {
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
      aria-label="Your finished picture"
    >
      <div
        className="max-h-full w-full max-w-md animate-pop-in overflow-y-auto rounded-card border-[3px] border-ink/75 bg-paper p-4 shadow-lifted sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center font-hand text-4xl font-bold text-ink">Look what you made 🥹</h3>

        <img
          src={image}
          alt="Your finished colouring"
          className="mt-3 w-full rounded-pebble border-2 border-ink/40"
        />

        <p className="mt-3 text-center font-body text-sm leading-relaxed text-ink-soft">
          On an iPad, press and hold the picture above and choose{' '}
          <span className="font-semibold">Save to Photos</span> — then send it to me, obviously.
        </p>

        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={image}
            download={filename}
            className="min-h-[52px] rounded-doodle border-[2.5px] border-sage-deep bg-sage-soft px-6 py-3 text-center font-hand text-2xl font-semibold leading-none text-ink shadow-sketch press-soft hover:bg-sage"
          >
            Download 💾
          </a>
          <DoodleButton variant="ghost" alt size="sm" onClick={onClose}>
            keep colouring
          </DoodleButton>
        </div>
      </div>
    </div>
  )
}
