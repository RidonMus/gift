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

/**
 * The two SVG sheets that make up a colouring page.
 *
 * A custom file at `memory.lineArt` takes over if it exists *and* carries
 * `data-fill` attributes — without those there would be nothing to tap-fill,
 * so we ignore it rather than hand her a page that does not respond.
 */
export function useLineArt(memory, fills) {
  const [custom, setCustom] = useState(null)

  useEffect(() => {
    let cancelled = false
    setCustom(null)

    const url = asset(memory.lineArt)
    if (!url) return undefined

    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => {
        if (cancelled) return
        if (text.includes('data-fill') && text.includes('<svg')) setCustom(text)
      })
      .catch(() => {
        /* Fall back to the built-in scene. */
      })

    return () => {
      cancelled = true
    }
  }, [memory.id, memory.lineArt])

  return useMemo(() => {
    if (custom) {
      return {
        fillLayer: withFills(stripStrokes(custom), fills, 'transparent'),
        // Flat white, to be composited with multiply — see sceneInkLayer.
        inkLayer: withFills(custom, null, '#FFFFFF'),
      }
    }
    return {
      fillLayer: sceneFillLayer(memory.scene, fills),
      inkLayer: sceneInkLayer(memory.scene),
    }
  }, [custom, memory.scene, fills])
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
