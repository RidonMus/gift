/* ---------------------------------------------------------------------------
 * memories.js — the only file you need to edit to make this yours.
 *
 * Each memory is one puzzle + one love note + one colouring page.
 *
 *   photo    the full-colour picture. Drives the 4x4 puzzle and the little
 *            reference thumbnail beside the board.
 *   lineArt  the black-and-white version. Becomes the colouring page; the app
 *            finds its fillable regions automatically (see rasterRegions.js).
 *   scene    a built-in hand-drawn scene, used only if the files above are
 *            missing, so the app never shows a broken image.
 *
 * Paths are relative to `public/`, i.e. `images/original1.jpg` resolves to
 * `public/images/original1.jpg`. No leading slash — that keeps the build
 * working on GitHub Pages, which serves this site from the /gift/ subfolder.
 *
 * The order of this array is the order she sees in the gallery.
 * ------------------------------------------------------------------------- */

export const memories = [
  {
    id: 'memory2',
    scene: 'Wedding',
    title: 'Our wedding day',
    emoji: '🥂',
    photo: 'images/original2.jpg',
    lineArt: 'images/memory2-lines.jpg',
    tapeColor: '#F3C4CB',
    tilt: -2.5,
    note: {
      headline: 'Our Wedding Day 🥂',
      body:
        'Remember the running around to make this day happen? I remember the stress of the clinics, ' +
        'the paperwork, finding the venue, so on... Looking at this photo, I know I would do it all over again. ' +
        'I can’t wait to see you again, and feel your embrace. For now, maybe this little corner helps.',
    },
  },
  {
    id: 'memory3',
    scene: 'proposal',
    title: 'Day I proposed (officially 😉)',
    emoji: '🌍',
    photo: 'images/original3.jpg',
    lineArt: 'images/memory3-lines.jpg',
    tapeColor: '#C3D5BC',
    tilt: 1.8,
    note: {
      headline: 'Day I proposed (officially 😉)',
      body:
        'We look so in love here. I love learning our stories together. This photo makes me feel ' +
        ' so many emotions, remember the proposal, I was covered with sweat underneath. ' +
        ' You look so beautiful here, your taste in outfits is amazing and I love how you are holding my hand',
    },
  },
  {
    id: 'memory1',
    scene: 'first date',
    title: 'Our Third Date',
    emoji: '🌙',
    photo: 'images/original1.jpg',
    lineArt: 'images/memory1-lines.jpg',
    tapeColor: '#F6E3A8',
    tilt: -1.2,
    note: {
      headline: 'Our Third Date 🌙',
      body:
        'Just a casual night, but your smile lit up that whole night. I love this casual, happy ' +
        'look. We don’t need much. This whole photo just feels like peace. Thinking of your laugh. ' +
        'Also thinking of the first time I kissed you. I can’t wait to do that again. Missing you, my love.',
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
  'If it helps: it took me a while too 😅',
]

/** Shown in the puzzle sidebar when a memory has no `hint` of its own. */
export const defaultHint = 'No timer, no score. Just you, sixteen little pieces, and me missing you. ❤️'

/** Shown on the welcome screen, one per visit. */
export const greetings = [
  'I built you a small, quiet place.',
  'For when the day has been a lot.',
  'And the real me is a little annoying',
  'A little corner that is only yours.',
  'Made entirely of missing you.',
]
