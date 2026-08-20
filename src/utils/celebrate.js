import confetti from 'canvas-confetti'

/* Pastels only — the confetti should feel like tissue paper, not a nightclub. */
const COZY_COLORS = ['#F3C4CB', '#C3D5BC', '#F6E3A8', '#C2DCE8', '#F7D2B6', '#D9CDE8']

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A soft, slow celebration: two side bursts drifting inward, then a gentle
 * fall of heart-ish confetti. Low gravity and low velocity keep it calm.
 */
export function celebrate() {
  if (prefersReducedMotion()) return

  const base = {
    colors: COZY_COLORS,
    disableForReducedMotion: true,
    scalar: 1.1,
    gravity: 0.7,
    decay: 0.93,
    ticks: 260,
  }

  confetti({ ...base, particleCount: 60, spread: 70, startVelocity: 42, origin: { x: 0.5, y: 0.62 } })

  setTimeout(() => {
    confetti({ ...base, particleCount: 45, angle: 60, spread: 65, startVelocity: 38, origin: { x: 0, y: 0.7 } })
    confetti({ ...base, particleCount: 45, angle: 120, spread: 65, startVelocity: 38, origin: { x: 1, y: 0.7 } })
  }, 180)

  // A slow drift of larger pieces, like the last of it settling.
  setTimeout(() => {
    confetti({
      ...base,
      particleCount: 34,
      spread: 120,
      startVelocity: 22,
      gravity: 0.45,
      scalar: 1.5,
      ticks: 340,
      origin: { x: 0.5, y: 0.35 },
    })
  }, 520)
}

/**
 * The big one, for the only question that matters. Three seconds of confetti
 * raining from both top corners, plus a heart burst up the middle.
 */
export function hugeCelebrate() {
  if (prefersReducedMotion()) return

  const end = Date.now() + 3000
  const shared = { colors: COZY_COLORS, disableForReducedMotion: true, ticks: 320 }

  ;(function rain() {
    confetti({ ...shared, particleCount: 6, angle: 60, spread: 70, startVelocity: 55, origin: { x: 0, y: 0.1 } })
    confetti({ ...shared, particleCount: 6, angle: 120, spread: 70, startVelocity: 55, origin: { x: 1, y: 0.1 } })
    if (Date.now() < end) requestAnimationFrame(rain)
  })()

  const hearts = { ...shared, shapes: ['circle'], scalar: 2, gravity: 0.5, startVelocity: 45 }
  ;[0, 400, 800, 1400].forEach((delay) =>
    setTimeout(
      () => confetti({ ...hearts, particleCount: 40, spread: 100, origin: { x: 0.5, y: 0.7 } }),
      delay,
    ),
  )
}

/** A single small puff — used when she saves a drawing. */
export function tinyCheer(origin = { x: 0.5, y: 0.7 }) {
  if (prefersReducedMotion()) return
  confetti({
    colors: COZY_COLORS,
    particleCount: 26,
    spread: 55,
    startVelocity: 26,
    gravity: 0.6,
    scalar: 0.95,
    ticks: 160,
    disableForReducedMotion: true,
    origin,
  })
}
