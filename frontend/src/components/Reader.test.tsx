import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { Reader } from './Reader'
import type { FileDocument } from '../lib/types'

function makeDocument(content: string): FileDocument {
  return {
    id: 'doc-1',
    name: 'guide.md',
    path: 'docs/guide.md',
    folder: 'docs',
    size: 120,
    modifiedAt: new Date().toISOString(),
    title: 'Reader Guide',
    tags: ['guide', 'manual'],
    wordCount: 440,
    content,
  }
}

function renderReader(content: string) {
  return render(
    <Reader
      document={makeDocument(content)}
      loading={false}
      error={undefined}
      onRetry={() => undefined}
      headings={[]}
      contentRef={createRef<HTMLDivElement>()}
      scrollRef={createRef<HTMLElement>()}
      justify={false}
    />,
  )
}

describe('Reader', () => {
  it('shows title, tags, and reading estimate', () => {
    renderReader('# Heading\n\nBody text.')
    expect(screen.getByRole('heading', { level: 1, name: 'Reader Guide' })).toBeInTheDocument()
    expect(screen.getByText('guide')).toBeInTheDocument()
    expect(screen.getByText('440 words')).toBeInTheDocument()
    expect(screen.getByText('2 min read')).toBeInTheDocument()
  })

  it('renders GitHub alerts as labelled callouts and anchors headings', () => {
    const { container } = renderReader('> [!WARNING]\n> Be careful here.\n\n## Section One\n')
    const callout = container.querySelector('blockquote.callout')
    expect(callout).toHaveClass('callout-warning')
    expect(callout?.textContent).toContain('Be careful here.')
    expect(container.querySelector('h2')?.id).toBe('section-one')
    expect(container.querySelector('h2 a.heading-anchor')).toBeTruthy()
  })

  it('wraps code blocks with a language label and copy action', () => {
    const { container } = renderReader('```python\nprint("hi")\n```\n')
    expect(container.querySelector('.code-language')?.textContent).toBe('python')
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument()
  })

  it('blocks unsafe inline HTML and resolves relative images', () => {
    const { container } = renderReader('<script>alert(1)</script>\n\n![shot](./shot.png)\n')
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/api/files/doc-1/images?path=.%2Fshot.png',
    )
  })
})
