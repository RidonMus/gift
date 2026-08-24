/* ---------------------------------------------------------------------------
 * The questions that ship with the jar.
 *
 * These are always available, with or without a network — the cloud notes from
 * Supabase get merged on top once they arrive. That ordering is deliberate: if
 * the connection is down in Tashkent at 1am, the jar still works.
 * ------------------------------------------------------------------------- */

export const preloadedQuestions = [
  'What was your absolute favorite moment from our wedding celebration in Antalya?',
  'If we could instantly teleport back to Turkey for one night, what would we do?',
  'What is a weird habit I have that you secretly find cute?',
  'If I knocked on your door in Tashkent right now, what is the exact first thing we would do?',
  'What was your exact first impression of me the day we met?',
  'What is your favorite inside joke we share?',
  'When did you know you were going to marry me?',
  'If you could fast-forward to a random Tuesday five years from now, what does our evening look like?',
  'What’s one thing I do that always makes you feel loved, even from a distance?',
  'What is the funniest thing that has ever happened to us on a trip?',
].map((text, i) => ({ id: `preloaded-${i}`, text, source: 'preloaded' }))
