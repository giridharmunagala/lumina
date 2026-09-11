import { localImageUrl } from './api'
import { resolveMarkdownImage } from './markdown'

describe('Markdown image URL resolution', () => {
  it('preserves permitted remote URLs', () => {
    expect(resolveMarkdownImage('https://images.example/readme.png', 'one')).toBe(
      'https://images.example/readme.png',
    )
    expect(resolveMarkdownImage('//cdn.example/image.webp', 'one')).toBe('//cdn.example/image.webp')
  })

  it('sends relative images to the backend resolver', () => {
    expect(resolveMarkdownImage('../assets/my diagram.png', 'folder/note')).toBe(
      '/api/files/folder%2Fnote/images?path=..%2Fassets%2Fmy+diagram.png',
    )
    expect(localImageUrl('a/b', './image.png')).toBe(
      '/api/files/a%2Fb/images?path=.%2Fimage.png',
    )
  })

  it('drops unsafe protocols', () => {
    expect(resolveMarkdownImage('javascript:alert(1)', 'one')).toBe('')
    expect(resolveMarkdownImage('file:///etc/passwd', 'one')).toBe('')
  })
})
