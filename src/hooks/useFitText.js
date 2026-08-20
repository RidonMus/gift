import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Shrink a single line of text until it fits its container.
 *
 * Measured rather than guessed from string length, because the sidebar is
 * full-width on an iPad and a narrow column on a desktop — the same title
 * needs a different size in each, and a character-count rule cannot know
 * which one it is in. If the text still will not fit at `min`, it is allowed
 * to wrap normally instead of being shrunk into illegibility.
 */
export function useFitText(text, { max = 36, min = 20, step = 2 } = {}) {
  const ref = useRef(null)

  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return

    el.style.whiteSpace = 'nowrap'
    let size = max
    el.style.fontSize = `${size}px`

    while (size > min && el.scrollWidth > el.clientWidth) {
      size -= step
      el.style.fontSize = `${size}px`
    }

    // Out of room even at the smallest size — let it wrap rather than clip.
    el.style.whiteSpace = el.scrollWidth > el.clientWidth ? 'normal' : 'nowrap'
  }, [max, min, step])

  useLayoutEffect(fit, [fit, text])

  // The breakpoint between the stacked and side-by-side layouts changes how
  // much room there is, so re-fit whenever the window (or the iPad) turns.
  useEffect(() => {
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
    }
  }, [fit])

  return ref
}
