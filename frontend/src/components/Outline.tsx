import type { CSSProperties } from 'react'
import type { Heading } from '../lib/types'

export function Outline({
  headings,
  activeId,
  onNavigate,
}: {
  headings: Heading[]
  activeId: string
  onNavigate: (id: string) => void
}) {
  if (!headings.length) {
    return <p className="outline-empty">This document has no headings.</p>
  }
  const minLevel = Math.min(...headings.map((heading) => heading.level))
  return (
    <nav className="outline-nav" aria-label="On this page">
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          className={activeId === heading.id ? 'current' : ''}
          aria-current={activeId === heading.id ? 'location' : undefined}
          style={{ '--level': heading.level - minLevel + 1 } as CSSProperties}
          onClick={(event) => {
            event.preventDefault()
            onNavigate(heading.id)
          }}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  )
}
