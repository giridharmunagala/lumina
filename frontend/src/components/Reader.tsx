import { ArrowUp, BookOpen, Command, Hash, Slash } from 'lucide-react'
import type { RefObject } from 'react'
import type { Schema } from 'hast-util-sanitize'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { fullDate, readingMinutes, relativeTime } from '../lib/format'
import { rehypeReader } from '../lib/markdown'
import type { FileDocument, Heading } from '../lib/types'
import { CodeBlock } from './CodeBlock'
import { ErrorNotice, Spinner } from './Feedback'

const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    input: [...(defaultSchema.attributes?.input ?? []), ['type', 'checkbox'], 'checked', 'disabled'],
  },
}

const markdownComponents = { pre: CodeBlock }

function Welcome() {
  return (
    <main className="welcome-state">
      <div className="welcome-icon">
        <BookOpen />
      </div>
      <p className="eyebrow">YOUR LOCAL READING SPACE</p>
      <h1>
        Read deeply.
        <br />
        Stay focused.
      </h1>
      <p className="welcome-copy">Pick a document from your library, or jump straight to one.</p>
      <div className="welcome-hints">
        <span>
          <Command aria-hidden="true" />
          <kbd>Ctrl</kbd>
          <kbd>K</kbd> Quick open
        </span>
        <span>
          <Slash aria-hidden="true" />
          <kbd>/</kbd> Search library
        </span>
        <span>
          <Hash aria-hidden="true" />
          <kbd>?</kbd> All shortcuts
        </span>
      </div>
    </main>
  )
}

export function Reader({
  document,
  loading,
  error,
  onRetry,
  headings,
  contentRef,
  scrollRef,
  justify,
}: {
  document?: FileDocument
  loading: boolean
  error: unknown
  onRetry: () => void
  headings: Heading[]
  contentRef: RefObject<HTMLDivElement>
  scrollRef: RefObject<HTMLElement>
  justify: boolean
}) {
  if (loading) {
    return (
      <main className="center-state">
        <Spinner label="Opening document…" />
      </main>
    )
  }
  if (error) {
    return (
      <main className="center-state">
        <ErrorNotice error={error} retry={onRetry} />
      </main>
    )
  }
  if (!document) return <Welcome />

  const words = document.wordCount || document.content.trim().split(/\s+/).filter(Boolean).length
  return (
    <main className="reader-scroll" ref={scrollRef as RefObject<HTMLElement>} tabIndex={-1}>
      <article className={`reader-article ${justify ? 'justified' : ''}`}>
        <header className="document-header">
          <div className="document-path" title={document.path}>
            {document.path}
          </div>
          <h1>{document.title}</h1>
          <div className="metadata" aria-label="Document metadata">
            <span>{words.toLocaleString()} words</span>
            <span>{readingMinutes(words)} min read</span>
            <span title={fullDate(document.modifiedAt)}>Updated {relativeTime(document.modifiedAt)}</span>
          </div>
          {document.tags.length > 0 && (
            <ul className="tag-row" aria-label="Tags">
              {document.tags.map((tag) => (
                <li key={tag} className="tag-chip">
                  <Hash aria-hidden="true" />
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>
        <div className="markdown-body" ref={contentRef}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
            rehypePlugins={[
              rehypeRaw,
              [rehypeSanitize, sanitizeSchema],
              rehypeKatex,
              rehypeHighlight,
              [rehypeReader, document.id],
            ]}
            components={markdownComponents}
          >
            {document.content}
          </ReactMarkdown>
        </div>
        <footer className="document-footer">
          <span>
            End of document · {headings.length} {headings.length === 1 ? 'section' : 'sections'}
          </span>
          <button
            className="text-button"
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp aria-hidden="true" />
            Back to top
          </button>
        </footer>
      </article>
    </main>
  )
}
