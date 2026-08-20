import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useState that survives a refresh, via localStorage.
 *
 * Everything is wrapped in try/catch on purpose: iPad Safari throws on
 * localStorage in private browsing, and losing a saved colour is never worth
 * a white screen.
 */
export function useStickyState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored === null ? initialValue : JSON.parse(stored)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* Quota or private mode — carry on, just without persistence. */
    }
  }, [key, value])

  return [value, setValue]
}

/**
 * A value that flips back to null on its own after `ms`. Handy for the little
 * "saved!" toast without leaving a timer to leak on unmount.
 */
export function useTransientMessage(ms = 2600) {
  const [message, setMessage] = useState(null)
  const timerRef = useRef(null)

  const show = useCallback(
    (text) => {
      setMessage(text)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setMessage(null), ms)
    },
    [ms],
  )

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), [])

  return [message, show]
}
