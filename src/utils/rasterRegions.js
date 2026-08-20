/* ---------------------------------------------------------------------------
 * rasterRegions.js — turn a photo run through an outline filter into
 * tappable fill regions, the same way the built-in scenes get them for free
 * from `data-fill` attributes.
 *
 * A photo-derived line drawing has no SVG shapes to hang a region id on — it
 * is just black lines on a white JPEG. So we find the regions ourselves:
 * threshold the image to "line" vs "open" pixels, then flood-fill every
 * connected patch of open pixels into its own numbered label. From then on,
 * "which shape did she tap" is one array lookup, and "fill that shape" is
 * "paint every pixel carrying that label".
 * ------------------------------------------------------------------------- */

// Below this luminance (0-255) a pixel counts as ink. Generous on purpose —
// JPEG ringing softens pure black to a dark grey right at the line edge, and
// under-catching that halo is what lets fill colour leak between regions.
const LINE_LUMINANCE = 210

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Render `image` onto a `size`x`size` square and label every connected patch
 * of non-line pixels. Label 0 is reserved for ink and is never fillable.
 *
 * Flood fill is iterative (an explicit stack, not recursion) because a
 * background region can easily cover hundreds of thousands of pixels — a
 * recursive fill would blow the call stack.
 */
export function buildRegionMap(image, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(image, 0, 0, size, size)

  const { data } = ctx.getImageData(0, 0, size, size)
  const pixelCount = size * size

  const isLine = new Uint8Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4
    isLine[i] = luminance(data[o], data[o + 1], data[o + 2]) < LINE_LUMINANCE ? 1 : 0
  }
  dilateOnce(isLine, size)

  const labels = new Int32Array(pixelCount) // 0 = ink / unlabeled
  const regionSizes = [0] // index 0 unused (matches label 0)
  const stack = new Int32Array(pixelCount)
  let nextLabel = 0

  for (let start = 0; start < pixelCount; start++) {
    if (isLine[start] || labels[start] !== 0) continue

    nextLabel++
    let count = 0
    let top = 0
    stack[top++] = start
    labels[start] = nextLabel

    while (top > 0) {
      const p = stack[--top]
      count++
      const x = p % size
      const y = (p / size) | 0

      if (x > 0) tryVisit(p - 1)
      if (x < size - 1) tryVisit(p + 1)
      if (y > 0) tryVisit(p - size)
      if (y < size - 1) tryVisit(p + size)
    }
    regionSizes.push(count)

    // eslint-disable-next-line no-inner-declarations
    function tryVisit(np) {
      if (!isLine[np] && labels[np] === 0) {
        labels[np] = nextLabel
        stack[top++] = np
      }
    }
  }

  // Specks smaller than this are almost always JPEG noise, not a shape she'd
  // ever mean to tap — merging them into "unfillable" keeps stray taps from
  // colouring a single stray pixel she can't see or undo.
  const MIN_REGION_PIXELS = 24
  for (let i = 0; i < pixelCount; i++) {
    if (labels[i] !== 0 && regionSizes[labels[i]] < MIN_REGION_PIXELS) labels[i] = 0
  }

  return {
    size,
    labels,
    regionCount: nextLabel,
    labelAt(x, y) {
      const xi = Math.max(0, Math.min(size - 1, x | 0))
      const yi = Math.max(0, Math.min(size - 1, y | 0))
      return labels[yi * size + xi]
    },
  }
}

/** One pass of binary dilation — closes single-pixel gaps in the ink mask. */
function dilateOnce(mask, size) {
  const out = mask.slice()
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      if (mask[i]) continue
      const left = x > 0 && mask[i - 1]
      const right = x < size - 1 && mask[i + 1]
      const up = y > 0 && mask[i - size]
      const down = y < size - 1 && mask[i + size]
      if (left || right || up || down) out[i] = 1
    }
  }
  mask.set(out)
}

/**
 * Paint `fills` (label -> hex colour) onto a same-size canvas as flat pixels.
 * This is the raster equivalent of the SVG fill layer: no strokes, just
 * colour, ready to sit under the brush canvas and the ink image.
 */
export function paintFillLayer(ctx, regionMap, fills) {
  const { size, labels } = regionMap
  const out = ctx.createImageData(size, size)
  const rgb = {}
  for (const [label, hex] of Object.entries(fills)) rgb[label] = hexToRgb(hex)

  for (let i = 0; i < size * size; i++) {
    const label = labels[i]
    const color = label && rgb[label]
    const o = i * 4
    if (color) {
      out.data[o] = color.r
      out.data[o + 1] = color.g
      out.data[o + 2] = color.b
      out.data[o + 3] = 255
    } else {
      out.data[o + 3] = 0
    }
  }
  ctx.putImageData(out, 0, 0)
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
