import { createClient } from '@supabase/supabase-js'

/* ---------------------------------------------------------------------------
 * The shared question jar.
 *
 * These credentials are meant to be public — the `sb_publishable_` key is the
 * browser-side key, and every rule about who may read or write lives in the
 * table's row-level security policies, not in secrecy of this string.
 *
 * Right now those policies allow anyone to read and anyone to insert, and
 * nobody to delete. Which is exactly what a shared jar between two people
 * wants, with one caveat worth knowing: there is no way to take a note back
 * out from inside the app. Removing one means opening the Supabase dashboard.
 * ------------------------------------------------------------------------- */

const SUPABASE_URL = 'https://vxnerykpfqclkziyowne.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_G7j7pSNS05b_sstQ5vq0xg_vzILLyjG'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Nobody signs in here, so skip the session plumbing entirely — it only
    // costs a localStorage write and a token refresh timer we never use.
    persistSession: false,
    autoRefreshToken: false,
  },
})

const TABLE = 'custom_questions'
const NOTES_TABLE = 'tree_notes'

/**
 * Every note anyone has dropped in the jar, oldest first.
 * Returns an array — never throws — because the jar has to keep working on a
 * plane, on hotel wifi, or any other time the network quietly disappears.
 */
export async function fetchCustomQuestions() {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, content')
      .order('created_at', { ascending: true })

    if (error) throw error

    return (data || [])
      .map((row) => ({ id: `cloud-${row.id}`, text: (row.content || '').trim(), source: 'cloud' }))
      .filter((q) => q.text.length > 0)
  } catch {
    return []
  }
}

/**
 * Drop a new note in the jar.
 * Resolves to `{ ok, question, error }` rather than throwing, so the caller can
 * show a gentle message instead of wiring up a try/catch around every save.
 */
export async function addCustomQuestion(text) {
  const content = text.trim()
  if (!content) return { ok: false, error: 'Write something first.' }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ content })
      .select('id, content')
      .single()

    if (error) throw error

    return { ok: true, question: { id: `cloud-${data.id}`, text: data.content, source: 'cloud' } }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach the jar.' }
  }
}

/* ---------------------------------------------------------------------------
 * The note tree. Same shape as the jar above, same reasoning: never throw,
 * always hand back something the UI can render.
 * ------------------------------------------------------------------------- */

/** Every note left on the tree, newest first. */
export async function fetchTreeNotes() {
  try {
    const { data, error } = await supabase
      .from(NOTES_TABLE)
      .select('id, message, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || [])
      .map((row) => ({ id: row.id, message: (row.message || '').trim(), createdAt: row.created_at }))
      .filter((note) => note.message.length > 0)
  } catch {
    return []
  }
}

/** Hang a new note on the tree. Resolves to `{ ok, note, error }`. */
export async function addTreeNote(message) {
  const text = message.trim()
  if (!text) return { ok: false, error: 'Write something first.' }

  try {
    const { data, error } = await supabase
      .from(NOTES_TABLE)
      .insert({ message: text })
      .select('id, message, created_at')
      .single()

    if (error) throw error

    return {
      ok: true,
      note: { id: data.id, message: data.message, createdAt: data.created_at },
    }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach the tree.' }
  }
}
