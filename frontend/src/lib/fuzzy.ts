/**
 * Subsequence matcher used by the command palette. Returns a score where a
 * higher value is a better match, or -1 when the query does not match at all.
 */
export function fuzzyScore(query: string, target: string): number {
  const needle = query.trim().toLowerCase()
  if (!needle) return 0
  const haystack = target.toLowerCase()
  if (haystack.includes(needle)) {
    return 1000 - haystack.indexOf(needle) - Math.max(0, target.length - needle.length) * 0.1
  }
  let score = 0
  let index = 0
  let streak = 0
  for (const character of needle) {
    const found = haystack.indexOf(character, index)
    if (found === -1) return -1
    streak = found === index ? streak + 1 : 0
    score += 10 + streak * 4 - Math.min(8, found - index)
    index = found + 1
  }
  return score
}

export function fuzzyFilter<T>(items: T[], query: string, key: (item: T) => string, limit = 40): T[] {
  if (!query.trim()) return items.slice(0, limit)
  return items
    .map((item) => ({ item, score: fuzzyScore(query, key(item)) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item)
}
