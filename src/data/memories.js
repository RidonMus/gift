/* ---------------------------------------------------------------------------
 * memories.js — the only file you need to edit to make this yours.
 *
 * Each memory is one puzzle + one love note + one colouring page.
 *
 * `photo` / `lineArt` are optional. Point them at files you drop into
 * `public/images/` and they take over; leave them missing (or misspelled, or
 * not uploaded yet) and the app quietly falls back to the built-in hand-drawn
 * scene named by `scene`. Nothing ever renders as a broken image.
 *
 * Paths are relative to `public/`, i.e. `images/memory1.jpg` resolves to
 * `public/images/memory1.jpg`. No leading slash — that keeps the build working
 * on GitHub Pages project sites, which are served from a subfolder.
 * ------------------------------------------------------------------------- */

export const memories = [
  {
    id: 'cocoa',
    scene: 'cocoa',
    title: 'The Rainy Window',
    subtitle: 'two mugs, one blanket, zero plans',
    photo: 'images/memory1.jpg',
    lineArt: 'images/memory1-lines.jpg',
    tapeColor: '#F3C4CB',
    tilt: -2.5,
    // Shown while she is working on the puzzle.
    hint: 'Take your time, my love. The cocoa is not going anywhere. ❤️',
    // Shown on the reveal screen once the puzzle clicks into place.
    note: {
      headline: 'You put us back together. ✨',
      body:
        'Do you remember this one? You said you would "just have one sip" of my cocoa ' +
        'and then returned an empty mug and absolutely no remorse.',
      punchline: 'I would let you do it again. Every single time.',
      signoff: 'Still yours, even from this far away.',
    },
  },
  {
    id: 'movieNight',
    scene: 'movieNight',
    title: 'Movie Night',
    subtitle: 'you fell asleep in 11 minutes',
    photo: 'images/memory2.jpg',
    lineArt: 'images/memory2-lines.jpg',
    tapeColor: '#C3D5BC',
    tilt: 1.8,
    hint: 'No timer, no score. Just you and some slightly muddled cats. 🐈',
    note: {
      headline: 'Reunited at last! 🍿',
      body:
        'The film we picked so carefully, paused at 00:11:04, where it has remained ' +
        'ever since. You claim you "were just resting your eyes". The cats testified otherwise.',
      punchline: 'Best eleven minutes of cinema I have ever had.',
      signoff: 'Save me a spot on the couch.',
    },
  },
  {
    id: 'picnic',
    scene: 'picnic',
    title: 'The Picnic',
    subtitle: 'the wind took the napkins',
    photo: 'images/memory3.jpg',
    lineArt: 'images/memory3-lines.jpg',
    tapeColor: '#F6E3A8',
    tilt: -1.2,
    hint: 'Slowly, gently. Nobody is counting. 🌿',
    note: {
      headline: 'Look at that — perfect. 🧺',
      body:
        'We packed for a picnic like we were crossing a desert, and then spent the whole ' +
        'afternoon chasing one runaway napkin down a hill while the sandwiches went stale.',
      punchline: 'You laughed so hard you sat in the watermelon. I have never recovered.',
      signoff: 'Next one is on me. Bring the same laugh.',
    },
  },
]

/** Little handwritten nudges, rotated so the puzzle screen never feels static. */
export const encouragements = [
  'Take your time, my love ❤️',
  'There is no wrong way to do this ✨',
  'Deep breath. You are doing beautifully.',
  'Somewhere far away, I am rooting for you.',
  'Slow is perfectly allowed here.',
  'This corner of the internet is only yours.',
  'If it helps: I could not solve it either 😅',
]

/** Shown on the welcome screen, one per visit. */
export const greetings = [
  'I built you a small, quiet place.',
  'For when the day has been a lot.',
  'A little corner that is only yours.',
  'Made entirely of missing you.',
]
