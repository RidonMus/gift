import { useEffect, useMemo, useState } from 'react'
import { asset, probeImage } from '../utils/assets'
import { sceneDataUri, sceneFillLayer, sceneInkLayer } from '../art/scenes'

/**
 * The colour picture for a memory's puzzle.
 *
 * Tries the real photo first; if the file is not there yet (which is the state
 * this repo ships in) it falls back to the built-in hand-drawn scene. Either
 * way the caller gets a usable image URL immediately — the fallback is
 * synchronous, so the puzzle never flashes empty or shows a broken image.
 */
export function usePuzzleImage(memory) {
  const [src, setSrc] = useState(() => sceneDataUri(memory.scene, 'color'))

  useEffect(() => {
    let cancelled = false
    setSrc(sceneDataUri(memory.scene, 'color'))

    const candidate = asset(memory.photo)
    if (!candidate) return undefined

    probeImage(candidate)
      .then((ok) => {
        if (!cancelled) setSrc(ok)
      })
      .catch(() => {
        /* No photo dropped in yet — the drawing is a perfectly good stand-in. */
      })

    return () => {
      cancelled = true
    }
  }, [memory.id, memory.scene, memory.photo])

  return src
}

const RASTER_EXT = /\.(jpe?g|png|webp)$/i

/**
 * What kind of colouring page `memory.lineArt` points at, resolved once so
 * the coloring screen doesn't have to guess.
 *
 * Three outcomes:
 *   'vector-custom' — an SVG with data-fill regions, drawn by hand
 *   'raster-photo'  — a JPG/PNG run through an outline filter (no shapes to
 *                      hang a region on, so ColoringScreen finds them itself
 *                      via useRasterLineArt / buildRegionMap)
 *   'vector-builtin' — nothing usable was found; fall back to the built-in scene
 *
 * A raster file only needs to exist to qualify — unlike the SVG path there is
 * no content to sniff, since region-finding happens on pixels, not markup.
 */
export function useLineArtSource(memory) {
  const [resolved, setResolved] = useState(null)

  useEffect(() => {
    let cancelled = false
    setResolved(null)

    const url = asset(memory.lineArt)
    if (!url) {
      setResolved({ mode: 'vector-builtin' })
      return undefined
    }

    if (RASTER_EXT.test(url)) {
      probeImage(url)
        .then(() => {
          if (!cancelled) setResolved({ mode: 'raster-photo', src: url })
        })
        .catch(() => {
          if (!cancelled) setResolved({ mode: 'vector-builtin' })
        })
      return () => {
        cancelled = true
      }
    }

    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => {
        if (cancelled) return
        if (text.includes('data-fill') && text.includes('<svg')) {
          setResolved({ mode: 'vector-custom', markup: text })
        } else {
          setResolved({ mode: 'vector-builtin' })
        }
      })
      .catch(() => {
        if (!cancelled) setResolved({ mode: 'vector-builtin' })
      })

    return () => {
      cancelled = true
    }
  }, [memory.id, memory.lineArt])

  return resolved
}

/**
 * The two SVG sheets for a vector colouring page (built-in or custom).
 * Not meaningful in 'raster-photo' mode — ColoringScreen builds its layers
 * differently there, straight from the photo and its region map.
 */
export function useVectorLineArt(memory, source, fills) {
  return useMemo(() => {
    if (source?.mode === 'vector-custom') {
      return {
        fillLayer: withFills(stripStrokes(source.markup), fills, 'transparent'),
        // Flat white, to be composited with multiply — see sceneInkLayer.
        inkLayer: withFills(source.markup, null, '#FFFFFF'),
      }
    }
    return {
      fillLayer: sceneFillLayer(memory.scene, fills),
      inkLayer: sceneInkLayer(memory.scene),
    }
  }, [source, memory.scene, fills])
}

/**
 * Rewrite the `fill` of every `data-fill="…"` element in a raw SVG string.
 * A regex is fine here — the input is our own artwork or a file the author
 * dropped in, and keeping it a pure string transform means both sheets can be
 * derived from one source without a DOM round-trip.
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
