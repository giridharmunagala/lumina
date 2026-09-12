const WORDS_PER_MINUTE = 220

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export function stripExtension(name: string): string {
  return name.replace(/\.(?:md|markdown|mdown|mkd)$/i, '')
}

export function folderOf(path: string): string {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/')
}

export function documentTitle(file: { title?: string; name?: string; path: string }): string {
  const title = file.title?.trim()
  if (title) return title
  return stripExtension(basename(file.name || file.path))
}

export function relativeTime(value?: string): string {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000)
  if (Math.abs(days) < 1) return 'Today'
  if (Math.abs(days) < 30) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(days, 'day')
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function fullDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

/** Split text into alternating plain and matching segments for highlighting. */
export function highlightSegments(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [{ text, match: false }]
  const segments: { text: string; match: boolean }[] = []
  const haystack = text.toLowerCase()
  let index = 0
  for (;;) {
    const found = haystack.indexOf(needle, index)
    if (found === -1) break
    if (found > index) segments.push({ text: text.slice(index, found), match: false })
    segments.push({ text: text.slice(found, found + needle.length), match: true })
    index = found + needle.length
  }
  if (index < text.length) segments.push({ text: text.slice(index), match: false })
  return segments.length ? segments : [{ text, match: false }]
}
