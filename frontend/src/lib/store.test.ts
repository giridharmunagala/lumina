import { fuzzyFilter, fuzzyScore } from './fuzzy'
import {
  groupByFolder,
  loadFavorites,
  orderByIds,
  pushRecent,
  RECENTS_LIMIT,
  saveFavorites,
  sortFiles,
  toggleId,
} from './store'
import type { MarkdownFile } from './types'

function file(id: string, path: string, modifiedAt: string, title = id): MarkdownFile {
  return {
    id,
    name: path.split('/').pop() ?? path,
    path,
    folder: path.split('/').slice(0, -1).join('/'),
    size: 10,
    modifiedAt,
    title,
    tags: [],
    wordCount: 5,
  }
}

const files = [
  file('a', 'notes/alpha.md', '2026-01-03T00:00:00Z', 'Alpha'),
  file('b', 'beta.md', '2026-01-05T00:00:00Z', 'Beta'),
  file('c', 'notes/gamma.md', '2026-01-01T00:00:00Z', 'Gamma'),
]

describe('library store', () => {
  beforeEach(() => localStorage.clear())

  it('persists and toggles favorites', () => {
    expect(loadFavorites()).toEqual([])
    saveFavorites(toggleId(loadFavorites(), 'a'))
    expect(loadFavorites()).toEqual(['a'])
    saveFavorites(toggleId(loadFavorites(), 'a'))
    expect(loadFavorites()).toEqual([])
  })

  it('ignores malformed stored values', () => {
    localStorage.setItem('lumina.favorites.v1', '{oops')
    expect(loadFavorites()).toEqual([])
  })

  it('keeps recents unique, newest first, and bounded', () => {
    let recents: string[] = []
    for (let index = 0; index < RECENTS_LIMIT + 4; index += 1) recents = pushRecent(recents, `id-${index}`)
    recents = pushRecent(recents, 'id-5')
    expect(recents[0]).toBe('id-5')
    expect(recents).toHaveLength(RECENTS_LIMIT)
    expect(new Set(recents).size).toBe(RECENTS_LIMIT)
  })

  it('sorts, groups, and orders documents', () => {
    expect(sortFiles(files, 'recent').map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(sortFiles(files, 'name').map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(sortFiles(files, 'path').map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(groupByFolder(files).map((group) => group.label)).toEqual(['notes', 'Top level'])
    expect(orderByIds(files, ['c', 'missing', 'b']).map((item) => item.id)).toEqual(['c', 'b'])
  })
})

describe('fuzzy matching', () => {
  it('prefers direct substring matches and rejects non-matches', () => {
    expect(fuzzyScore('alpha', 'notes/alpha.md')).toBeGreaterThan(fuzzyScore('alpha', 'a-l-p-h-a'))
    expect(fuzzyScore('zzz', 'alpha')).toBe(-1)
    expect(fuzzyScore('', 'alpha')).toBe(0)
  })

  it('filters and ranks candidates', () => {
    const ranked = fuzzyFilter(files, 'gam', (item) => `${item.title} ${item.path}`)
    expect(ranked[0].id).toBe('c')
    expect(fuzzyFilter(files, '', (item) => item.title, 2)).toHaveLength(2)
  })
})
