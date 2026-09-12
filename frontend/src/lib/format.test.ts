import { documentTitle, folderOf, formatBytes, highlightSegments, readingMinutes, relativeTime } from './format'

describe('formatting helpers', () => {
  it('derives titles and folders from paths', () => {
    expect(documentTitle({ title: 'Front matter', name: 'a.md', path: 'docs/a.md' })).toBe('Front matter')
    expect(documentTitle({ title: '  ', name: 'release-notes.markdown', path: 'x/release-notes.markdown' })).toBe(
      'release-notes',
    )
    expect(folderOf('docs/guides/setup.md')).toBe('docs/guides')
    expect(folderOf('top.md')).toBe('')
  })

  it('describes time and size in human terms', () => {
    expect(relativeTime(new Date().toISOString())).toBe('Today')
    expect(relativeTime(undefined)).toBe('Unknown')
    expect(relativeTime('not a date')).toBe('not a date')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(readingMinutes(0)).toBe(1)
    expect(readingMinutes(660)).toBe(3)
  })

  it('splits text into highlightable segments', () => {
    expect(highlightSegments('Release Notes', 'notes')).toEqual([
      { text: 'Release ', match: false },
      { text: 'Notes', match: true },
    ])
    expect(highlightSegments('nothing', '  ')).toEqual([{ text: 'nothing', match: false }])
    expect(highlightSegments('abc', 'z')).toEqual([{ text: 'abc', match: false }])
  })
})
