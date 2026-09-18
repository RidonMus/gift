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
const SCRAPBOOK_TABLE = 'scrapbook_items'
const SCRAPBOOK_BOARDS_TABLE = 'scrapbook_boards'

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

/** Remove a cloud question from the jar entirely. */
export async function deleteCustomQuestion(questionId) {
  const rawId = String(questionId ?? '').replace(/^cloud-/, '')
  const id = Number(rawId)

  if (!Number.isFinite(id)) {
    return { ok: false, error: 'Could not identify that question.' }
  }

  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not remove that question.' }
  }
}

/* ---------------------------------------------------------------------------
 * The note tree. Same shape as the jar above, same reasoning: never throw,
 * always hand back something the UI can render.
 * ------------------------------------------------------------------------- */

/**
 * Every note left on the tree, newest first.
 *
 * `author` is optional. The column may not exist yet, and PostgREST answers a
 * request for an unknown column with a 400 rather than ignoring it — so try
 * the richer shape first and quietly fall back to the plain one. That way the
 * tree works today and starts colour-coding the moment the column is added,
 * with no second deploy.
 */
/* Remembered for the session so we only pay for the probe once, instead of
 * logging a 400 on every single fetch until the column is added. */
let hasAuthorColumn = true

export async function fetchTreeNotes() {
  const shape = (row) => ({
    id: row.id,
    message: (row.message || '').trim(),
    createdAt: row.created_at,
    author: row.author || null,
  })

  try {
    if (hasAuthorColumn) {
      const withAuthor = await supabase
        .from(NOTES_TABLE)
        .select('id, message, created_at, author')
        .order('created_at', { ascending: false })

      if (!withAuthor.error) {
        return (withAuthor.data || []).map(shape).filter((n) => n.message.length > 0)
      }
      hasAuthorColumn = false
    }

    const plain = await supabase
      .from(NOTES_TABLE)
      .select('id, message, created_at')
      .order('created_at', { ascending: false })

    if (plain.error) throw plain.error
    return (plain.data || []).map(shape).filter((n) => n.message.length > 0)
  } catch {
    return []
  }
}

/**
 * Hang a new note on the tree. Resolves to `{ ok, note, error }`.
 * Same optional-column dance as the fetch above.
 */
export async function addTreeNote(message, author = null) {
  const text = message.trim()
  if (!text) return { ok: false, error: 'Write something first.' }

  const done = (row) => ({
    ok: true,
    note: {
      id: row.id,
      message: row.message,
      createdAt: row.created_at,
      author: row.author || author || null,
    },
  })

  try {
    if (author && hasAuthorColumn) {
      const attempt = await supabase
        .from(NOTES_TABLE)
        .insert({ message: text, author })
        .select('id, message, created_at, author')
        .single()
      if (!attempt.error) return done(attempt.data)
      hasAuthorColumn = false
    }

    const { data, error } = await supabase
      .from(NOTES_TABLE)
      .insert({ message: text })
      .select('id, message, created_at')
      .single()

    if (error) throw error
    return done(data)
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach the tree.' }
  }
}

/* ---------------------------------------------------------------------------
 * The scrapbook.
 *
 * This table is the one with full CRUD — unlike the jar and the tree, it
 * allows UPDATE and DELETE, which is what makes dragging (and tidying up a
 * misplaced sticker) possible at all.
 * ------------------------------------------------------------------------- */

function toItem(row) {
  return {
    id: row.id,
    type: row.item_type,
    content: row.content,
    x: Number(row.pos_x) || 0,
    y: Number(row.pos_y) || 0,
    rotation: Number(row.rotation) || 0,
    z: Number(row.z_index) || 1,
  }
}

/**
 * Everything pinned to one board, bottom of the stack first.
 * Pass no `boardId` (or a falsy one) to get every item regardless of board —
 * that is the pre-multi-board behaviour, kept as the default so a device that
 * has not yet learned about boards still sees everything that is there.
 */
export async function fetchScrapbookItems(boardId) {
  try {
    let query = supabase
      .from(SCRAPBOOK_TABLE)
      .select('id, item_type, content, pos_x, pos_y, rotation, z_index')
      .order('z_index', { ascending: true })

    if (boardId) query = query.eq('board_id', boardId)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(toItem)
  } catch {
    return []
  }
}

/** Pin something new. Resolves to `{ ok, item, error }`. */
export async function addScrapbookItem({ type, content, x, y, rotation, z, boardId }) {
  try {
    const payload = {
      item_type: type,
      content,
      pos_x: Math.round(x),
      pos_y: Math.round(y),
      rotation: Math.round(rotation * 100) / 100,
      z_index: z,
    }
    // Omitted when boards are not set up yet, so the insert still matches the
    // table's actual columns rather than failing on one that doesn't exist.
    if (boardId) payload.board_id = boardId

    const { data, error } = await supabase
      .from(SCRAPBOOK_TABLE)
      .insert(payload)
      .select('id, item_type, content, pos_x, pos_y, rotation, z_index')
      .single()

    if (error) throw error
    return { ok: true, item: toItem(data) }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not reach the board.' }
  }
}

/**
 * Save where something ended up. Called once on release, never mid-drag —
 * writing on every pointermove would be a few hundred round-trips per gesture.
 */
export async function moveScrapbookItem(id, { x, y, z }) {
  try {
    const { error } = await supabase
      .from(SCRAPBOOK_TABLE)
      .update({ pos_x: Math.round(x), pos_y: Math.round(y), z_index: z })
      .eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not save that move.' }
  }
}

/** Take something off the board for good. */
export async function removeScrapbookItem(id) {
  try {
    const { error } = await supabase.from(SCRAPBOOK_TABLE).delete().eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not remove that.' }
  }
}

/**
 * Live updates from the other side of the world, scoped to one board when
 * boards are in play so switching boards doesn't keep listening to the old
 * one. Each board gets its own channel name for the same reason.
 *
 * Requires the table to be added to the `supabase_realtime` publication in the
 * dashboard. If it is not, this simply never fires and the board still works —
 * it just needs a reload to see the other person's changes.
 */
export function subscribeToScrapbook(boardId, onChange) {
  const channel = supabase
    .channel(`scrapbook-board-${boardId || 'legacy'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SCRAPBOOK_TABLE,
        ...(boardId ? { filter: `board_id=eq.${boardId}` } : {}),
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onChange({ kind: 'delete', id: payload.old?.id })
        } else {
          onChange({ kind: payload.eventType.toLowerCase(), item: toItem(payload.new) })
        }
      },
    )
    .subscribe()

  return () => {
    try {
      supabase.removeChannel(channel)
    } catch {
      /* already torn down */
    }
  }
}

/* ---------------------------------------------------------------------------
 * Scrapbook boards.
 *
 * One scrapbook can become several: a save-and-start-fresh so a trip or a
 * season gets its own page instead of everything piling onto one endless
 * board. This needs its own table (`scrapbook_boards`) plus a `board_id`
 * column on `scrapbook_items`, neither of which exist until the one-time SQL
 * migration is run — until then `fetchScrapbookBoards` reports itself
 * unsupported and the app quietly keeps behaving exactly as it does today,
 * one continuous board with no switcher shown.
 * ------------------------------------------------------------------------- */

function toBoard(row) {
  return { id: row.id, name: row.name || 'Untitled board', createdAt: row.created_at, updatedAt: row.updated_at }
}

/**
 * Every board that exists, oldest first — so the board that the migration
 * created to hold everything already on the page is always the first one.
 * `unsupported: true` means the migration has not been run yet.
 */
export async function fetchScrapbookBoards() {
  try {
    const { data, error } = await supabase
      .from(SCRAPBOOK_BOARDS_TABLE)
      .select('id, name, created_at, updated_at')
      .order('created_at', { ascending: true })

    if (error) throw error
    return { ok: true, unsupported: false, boards: (data || []).map(toBoard) }
  } catch {
    return { ok: false, unsupported: true, boards: [] }
  }
}

/** Start a new, empty board. Resolves to `{ ok, board, error }`. */
export async function createScrapbookBoard(name) {
  const trimmed = (name || '').trim() || 'Untitled board'
  try {
    const { data, error } = await supabase
      .from(SCRAPBOOK_BOARDS_TABLE)
      .insert({ name: trimmed })
      .select('id, name, created_at, updated_at')
      .single()

    if (error) throw error
    return { ok: true, board: toBoard(data) }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not start that board.' }
  }
}

/** Rename a board. Resolves to `{ ok, error }`. */
export async function renameScrapbookBoard(id, name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return { ok: false, error: 'Give it a name first.' }

  try {
    const { error } = await supabase
      .from(SCRAPBOOK_BOARDS_TABLE)
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not rename that board.' }
  }
}

/**
 * Delete a board, and — via the foreign key's ON DELETE CASCADE set up in the
 * migration — every photo, note, and sticker pinned to it. Resolves to
 * `{ ok, error }`; the caller is responsible for making sure that is really
 * what she wants before calling this.
 */
export async function deleteScrapbookBoard(id) {
  try {
    const { error } = await supabase.from(SCRAPBOOK_BOARDS_TABLE).delete().eq('id', id)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not delete that board.' }
  }
}

/* ---------------------------------------------------------------------------
 * Photo uploads.
 *
 * Files go to a public Storage bucket and only the resulting URL is written to
 * the table, so `content` stays a short string. Stuffing a base64 data URI in
 * the column instead would work for exactly one photo and then make every
 * board load drag several megabytes of text across the world.
 * ------------------------------------------------------------------------- */

export const SCRAPBOOK_BUCKET = 'scrapbook'

/**
 * Shrink a picture before it leaves the device.
 *
 * Phone photos are 3-8MB and the board shows them about 200px wide. Uploading
 * the original would burn storage and make her wait on hotel wifi for detail
 * no one can see. Browsers bake EXIF rotation into an <img> these days, so
 * drawing through a canvas also quietly fixes sideways phone shots.
 */
export function compressImage(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not read that picture.'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file did not look like a picture.'))
    }
    img.src = url
  })
}

/**
 * Put a photo in the bucket and hand back its public URL.
 * Resolves to `{ ok, url, error, needsBucket }`.
 */
export async function uploadScrapbookPhoto(blob) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

  try {
    const { error } = await supabase.storage
      .from(SCRAPBOOK_BUCKET)
      .upload(name, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })

    if (error) {
      // Worth calling out by name: it is a one-time setup step, not a bug,
      // and the generic message gives no clue what to do about it.
      const missing = /bucket not found/i.test(error.message || '')
      return {
        ok: false,
        needsBucket: missing,
        error: missing
          ? 'The photo bucket has not been set up yet.'
          : error.message || 'Upload failed.',
      }
    }

    const { data } = supabase.storage.from(SCRAPBOOK_BUCKET).getPublicUrl(name)
    return { ok: true, url: data.publicUrl }
  } catch (err) {
    return { ok: false, error: err?.message || 'Upload failed.' }
  }
}
