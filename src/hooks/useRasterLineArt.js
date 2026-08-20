import { useEffect, useState } from 'react'
import { buildRegionMap } from '../utils/rasterRegions'

/* Labeling is deterministic for a given file, so once we've paid for it, we
 * never pay again — even across mounting the coloring screen twice. */
const cache = new Map()

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('failed to load ' + src))
    img.src = src
  })
}

/**
 * Load a raster (JPG/PNG) line-art image and label its fillable regions.
 * `size` must match the coloring canvas's working resolution so a tap
 * coordinate and a region label line up without any rescaling.
 */
export function useRasterLineArt(src, size) {
  const [state, setState] = useState(() => cache.get(src) || null)

  useEffect(() => {
    if (!src) {
      setState(null)
      return undefined
    }
    const cached = cache.get(src)
    if (cached) {
      setState(cached)
      return undefined
    }

    let cancelled = false
    setState(null)

    loadImage(src)
      .then((image) => {
        if (cancelled) return
        const regionMap = buildRegionMap(image, size)
        const ready = { image, regionMap }
        cache.set(src, ready)
        setState(ready)
      })
      .catch(() => {
        /* Caller falls back to the built-in scene when state stays null. */
      })

    return () => {
      cancelled = true
    }
  }, [src, size])

  return state
}
