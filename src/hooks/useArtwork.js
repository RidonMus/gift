import { useEffect, useMemo, useState } from 'react'
import { asset, probeImage } from '../utils/assets'

/* ---------------------------------------------------------------------------
 * Where a memory's two pictures come from.
 *
 * There is deliberately no stand-in artwork here. An earlier version fell back
 * to a built-in hand-drawn scene whenever a file was missing, which meant a
 * typo in a filename looked like a design choice instead of a mistake. Now a
 * missing file says so, in the place the picture should have been.
 * ------------------------------------------------------------------------- */

/**
 * The colour photo behind the puzzle.
 * `src` is usable immediately; `missing` flips true only if it fails to load.
 */
export function usePuzzleImage(memory) {
  const src = asset(memory.photo)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMissing(false)

    if (!src) {
      setMissing(true)
      return undefined
    }
    probeImage(src).catch(() => {
      if (!cancelled) setMissing(true)
    })

    return () => {
      cancelled = true
    }
  }, [src])

  return { src, missing, file: memory.photo }
}

const RASTER_EXT = /\.(jpe?g|png|webp)$/i

/**
 * What kind of colouring page `memory.lineArt` points at.
 *
 *   'raster-photo'  a JPG/PNG outline drawing. It has no shapes to hang a
 *                   region id on, so ColoringScreen finds them itself by
 *                   scanning the pixels (see rasterRegions.js).
 *   'vector-custom' a hand-authored SVG carrying `data-fill` attributes.
 *   'missing'       nothing usable — the screen says so.
 *
 * A raster file only needs to exist to qualify; there is no markup to sniff,
 * because region-finding happens on pixels rather than on elements.
 */
export function useLineArtSource(memory) {
  const [resolved, setResolved] = useState(null)

  useEffect(() => {
    let cancelled = false
    setResolved(null)

    const url = asset(memory.lineArt)
    if (!url) {
      setResolved({ mode: 'missing', file: memory.lineArt })
      return undefined
    }

    if (RASTER_EXT.test(url)) {
      probeImage(url)
        .then(() => {
          if (!cancelled) setResolved({ mode: 'raster-photo', src: url })
        })
        .catch(() => {
          if (!cancelled) setResolved({ mode: 'missing', file: memory.lineArt })
        })
      return () => {
        cancelled = true
      }
    }

    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => {
        if (cancelled) return
        // Without data-fill there is nothing to tap, so treat it as unusable
        // rather than handing her a page that will not respond.
        if (text.includes('data-fill') && text.includes('<svg')) {
          setResolved({ mode: 'vector-custom', markup: text })
        } else {
          setResolved({ mode: 'missing', file: memory.lineArt })
        }
      })
      .catch(() => {
        if (!cancelled) setResolved({ mode: 'missing', file: memory.lineArt })
      })

    return () => {
      cancelled = true
    }
  }, [memory.id, memory.lineArt])

  return resolved
}

/**
 * The two SVG sheets for a hand-authored colouring page.
 * Returns null for every other mode — raster pages build their layers from
 * pixels instead, and a missing page has no layers at all.
 */
export function useVectorLineArt(source, fills) {
  return useMemo(() => {
    if (source?.mode !== 'vector-custom') return null
    return {
      fillLayer: withFills(stripStrokes(source.markup), fills, 'transparent'),
      // Flat white, to be composited with multiply so her colours show through
      // while the outlines stay black.
      inkLayer: withFills(source.markup, null, '#FFFFFF'),
    }
  }, [source, fills])
}

/**
 * Rewrite the `fill` of every `data-fill="…"` element in a raw SVG string.
 * A regex is fine here — the input is a file the author dropped in, and
 * keeping it a pure string transform means both sheets can be derived from one
 * source without a DOM round-trip.
 */
function withFills(svgText, fills, emptyFill = 'transparent') {
  return svgText.replace(
    /<([a-zA-Z]+)([^>]*?)data-fill="([^"]+)"([^>]*?)(\/?)>/g,
    (tag, name, before, id, after, selfClose) => {
      const color = (fills && fills[id]) || emptyFill
      const stripped = (before + after).replace(/\sfill="[^"]*"/g, '')
      return `<${name}${stripped} data-fill="${id}" fill="${color}"${selfClose}>`
    },
  )
}

/** Turn a custom SVG into a fills-only sheet by silencing its outlines. */
function stripStrokes(svgText) {
  return svgText
    .replace(/\sstroke="(?!none)[^"]*"/g, ' stroke="none"')
    .replace(/<svg([^>]*)>/, '<svg$1 stroke="none">')
}
