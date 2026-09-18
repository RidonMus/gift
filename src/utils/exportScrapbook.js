import { asset } from './assets'
import { BOARD_H, BOARD_W, SIZES, STICKER_DEFS, STICKER_INK, noteColorFor } from './scrapbookShared'

/* ---------------------------------------------------------------------------
 * Turning the board into a PNG she can actually keep.
 *
 * Everything here draws in the same 1200x900 board-unit space the on-screen
 * canvas uses, then a single ctx.scale(2, ...) at the top makes the whole
 * thing crisp without every drawing call needing to know about it.
 *
 * Photos are loaded with crossOrigin="anonymous" because the ones already on
 * the board live in Supabase Storage, a different origin from the page. That
 * bucket does send `Access-Control-Allow-Origin: *`, so this works — without
 * it the canvas would be "tainted" and toDataURL would throw rather than
 * quietly fail, which is why a missing photo becomes a soft placeholder
 * instead of aborting the whole export.
 * ------------------------------------------------------------------------- */

const SCALE = 2
const CAPTION_H = 90

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('failed to load ' + src))
    img.src = src
  })
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word
    if (line && ctx.measureText(attempt).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = attempt
    }
  }
  if (line) lines.push(line)
  return lines
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawPolaroid(ctx, item, size, image) {
  const pad = 10
  const padBottom = 32

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size.w, size.h)

  const innerW = size.w - pad * 2
  const innerH = size.h - pad - padBottom

  if (image) {
    // object-fit: cover, by hand — crop to the frame's aspect ratio.
    const scale = Math.max(innerW / image.width, innerH / image.height)
    const sw = innerW / scale
    const sh = innerH / scale
    const sx = (image.width - sw) / 2
    const sy = (image.height - sh) / 2
    ctx.drawImage(image, sx, sy, sw, sh, pad, pad, innerW, innerH)
  } else {
    ctx.fillStyle = '#F7F4EE'
    ctx.fillRect(pad, pad, innerW, innerH)
    ctx.fillStyle = '#A29A93'
    ctx.font = '20px Caveat, cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('photo missing', pad + innerW / 2, pad + innerH / 2)
  }
}

function drawStickyNote(ctx, item, size) {
  ctx.fillStyle = noteColorFor(item.content)
  roundRectPath(ctx, 0, 0, size.w, size.h, 3)
  ctx.fill()

  ctx.fillStyle = '#3C3A38'
  ctx.font = '28px Caveat, cursive'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  const padX = 16
  const padY = 14
  const lineHeight = 30
  const lines = wrapText(ctx, item.content, size.w - padX * 2)
  const totalH = lines.length * lineHeight
  const startY = Math.max(padY, (size.h - totalH) / 2)
  lines.forEach((line, i) => ctx.fillText(line, padX, startY + i * lineHeight))
}

function drawSticker(ctx, name, size) {
  const def = STICKER_DEFS[name] || STICKER_DEFS.heart
  ctx.save()
  // The paths live in a 0..64 box; scaling the context lets every stroke
  // width and coordinate in `def` mean the same thing they do in the SVG.
  ctx.scale(size.w / 64, size.h / 64)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  def.paths.forEach((p) => {
    const path = new Path2D(p.d)
    ctx.globalAlpha = def.fillOpacity ?? 1
    ctx.fillStyle = def.fill
    ctx.fill(path)
    ctx.globalAlpha = 1
    ctx.strokeStyle = STICKER_INK
    ctx.lineWidth = 3
    ctx.stroke(path)
  })
  ;(def.extraStrokes || []).forEach((line) => {
    const path = new Path2D(line.d)
    ctx.globalAlpha = line.opacity ?? 1
    ctx.strokeStyle = STICKER_INK
    ctx.lineWidth = line.strokeWidth ?? 3
    ctx.stroke(path)
    ctx.globalAlpha = 1
  })

  ctx.restore()
}

/**
 * Render the board to a PNG data URL.
 * Never throws for an individual bad photo — a rotted link becomes a soft
 * placeholder in the export, the same as it does on screen.
 */
export async function exportScrapbookAsImage(items, boardName) {
  const photoItems = items.filter((i) => i.type === 'photo')
  const images = new Map()
  await Promise.all(
    photoItems.map(async (item) => {
      try {
        images.set(item.id, await loadImage(asset(item.content)))
      } catch {
        /* left unset — drawPolaroid falls back to a placeholder */
      }
    }),
  )

  const canvas = document.createElement('canvas')
  canvas.width = BOARD_W * SCALE
  canvas.height = (BOARD_H + CAPTION_H) * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = '#FBF9F5'
  ctx.fillRect(0, 0, BOARD_W, BOARD_H + CAPTION_H)

  // The same faint dot grid the on-screen board sits on.
  ctx.fillStyle = 'rgba(60, 58, 56, 0.14)'
  for (let y = 14; y < BOARD_H; y += 28) {
    for (let x = 14; x < BOARD_W; x += 28) {
      ctx.beginPath()
      ctx.arc(x, y, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  try {
    await document.fonts.ready
  } catch {
    /* the fallback face is fine */
  }

  const sorted = [...items].sort((a, b) => a.z - b.z)
  for (const item of sorted) {
    const size = SIZES[item.type] || SIZES.sticker
    const cx = item.x + size.w / 2
    const cy = item.y + size.h / 2

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((item.rotation * Math.PI) / 180)
    ctx.translate(-size.w / 2, -size.h / 2)

    if (item.type === 'photo') drawPolaroid(ctx, item, size, images.get(item.id))
    else if (item.type === 'note') drawStickyNote(ctx, item, size)
    else if (item.type === 'sticker') drawSticker(ctx, item.content, size)

    ctx.restore()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#3C3A38'
  ctx.font = '600 34px Caveat, cursive'
  ctx.fillText(boardName || 'Our Scrapbook', BOARD_W / 2, BOARD_H + 46)
  ctx.fillStyle = '#A29A93'
  ctx.font = '400 22px Caveat, cursive'
  ctx.fillText('made together, from far away 🤍', BOARD_W / 2, BOARD_H + 74)

  return canvas.toDataURL('image/png')
}

/** A safe filename from whatever she named the board. */
export function slugifyBoardName(name) {
  const slug = String(name || 'our-scrapbook')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'our-scrapbook'
}
