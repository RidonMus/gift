/**
 * Resolve a path from `public/` against whatever base URL the build was
 * deployed under. Keeps `images/memory1.jpg` working at both `/` and
 * `/your-repo/` without anyone having to think about it.
 */
export function asset(path) {
  if (!path) return null
  if (/^(https?:)?\/\/|^data:|^blob:/.test(path)) return path
  const base = import.meta.env.BASE_URL || '/'
  return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '')
}

/**
 * Resolve when an image URL actually loads, reject when it does not.
 * Used to decide between "her real photo" and "the built-in drawing".
 */
export function probeImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('no src'))
      return
    }
    const img = new Image()
    img.onload = () => (img.naturalWidth > 0 ? resolve(src) : reject(new Error('empty image')))
    img.onerror = () => reject(new Error('failed to load ' + src))
    img.src = src
  })
}
