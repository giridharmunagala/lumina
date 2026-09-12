import { Clock, FileText, FolderOpen, Hash, Star } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { highlightSegments, relativeTime } from '../lib/format'
import type { FileGroup } from '../lib/store'
import { groupByFolder, orderByIds, sortFiles } from '../lib/store'
import type { SortOrder } from '../lib/preferences'
import type { MarkdownFile, SearchResult } from '../lib/types'
import { EmptyState, ErrorNotice, Spinner } from './Feedback'

export type LibraryTab = 'all' | 'recent' | 'starred'

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  return (
    <>
      {highlightSegments(text, query).map((segment, index) =>
        segment.match ? (
          <em key={index} className="hit">
            {segment.text}
          </em>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

function FileRow({
  file,
  query,
  selected,
  active,
  starred,
  onSelect,
  onToggleStar,
  onHover,
}: {
  file: MarkdownFile | SearchResult
  query: string
  selected: boolean
  active: boolean
  starred: boolean
  onSelect: () => void
  onToggleStar: () => void
  onHover: () => void
}) {
  const excerpt = 'excerpt' in file ? file.excerpt : undefined
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])
  return (
    <div
      ref={ref}
      className={`file-item ${selected ? 'selected' : ''} ${active ? 'active' : ''}`}
      role="listitem"
      onMouseEnter={onHover}
    >
      <button className="file-open" onClick={onSelect} aria-current={selected ? 'true' : undefined}>
        <FileText aria-hidden="true" />
        <span className="file-copy">
          <strong>
            <Highlighted text={file.title} query={query} />
          </strong>
          <span className="file-path">
            <Highlighted text={file.path} query={query} />
          </span>
          {excerpt && (
            <small>
              <Highlighted text={excerpt} query={query} />
            </small>
          )}
          <span className="file-meta">
            <span>{relativeTime(file.modifiedAt)}</span>
            {file.wordCount > 0 && <span>{file.wordCount.toLocaleString()} words</span>}
            {file.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-chip">
                <Hash aria-hidden="true" />
                {tag}
              </span>
            ))}
          </span>
        </span>
      </button>
      <button
        className={`star-button ${starred ? 'on' : ''}`}
        onClick={onToggleStar}
        aria-label={starred ? `Unstar ${file.title}` : `Star ${file.title}`}
        aria-pressed={starred}
      >
        <Star aria-hidden="true" />
      </button>
    </div>
  )
}

export interface LibraryListProps {
  files: MarkdownFile[]
  results: SearchResult[] | null
  favorites: string[]
  recents: string[]
  tab: LibraryTab
  query: string
  sort: SortOrder
  grouped: boolean
  loading: boolean
  error: unknown
  selectedId?: string
  activeIndex: number
  onActiveIndex: (index: number) => void
  onItems: (items: MarkdownFile[]) => void
  onSelect: (file: MarkdownFile) => void
  onToggleStar: (id: string) => void
  onRetry: () => void
}

export function LibraryList(props: LibraryListProps) {
  const items = useMemo(() => {
    if (props.results) return props.results
    if (props.tab === 'recent') return orderByIds(props.files, props.recents)
    if (props.tab === 'starred') return orderByIds(props.files, props.favorites)
    return sortFiles(props.files, props.sort)
  }, [props.favorites, props.files, props.recents, props.results, props.sort, props.tab])

  const { onItems } = props
  useEffect(() => {
    onItems(items)
  }, [items, onItems])

  const groups: FileGroup<MarkdownFile>[] | null = useMemo(() => {
    if (!props.grouped || props.results || props.tab !== 'all') return null
    return groupByFolder(items)
  }, [items, props.grouped, props.results, props.tab])

  if (props.loading) return <Spinner label="Loading your library…" />
  if (props.error) return <ErrorNotice error={props.error} retry={props.onRetry} compact />
  if (!items.length) {
    if (props.query) {
      return <EmptyState icon={FileText} title="No matches" hint="Try a title, folder, or phrase." />
    }
    if (props.tab === 'starred') {
      return <EmptyState icon={Star} title="No starred documents" hint="Star a document to pin it here." />
    }
    if (props.tab === 'recent') {
      return <EmptyState icon={Clock} title="Nothing read yet" hint="Documents you open appear here." />
    }
    return <EmptyState icon={FolderOpen} title="Your library is empty" hint="Rescan to discover Markdown files." />
  }

  const row = (file: MarkdownFile, index: number) => (
    <FileRow
      key={file.id}
      file={file}
      query={props.query}
      selected={props.selectedId === file.id}
      active={props.activeIndex === index}
      starred={props.favorites.includes(file.id)}
      onSelect={() => props.onSelect(file)}
      onToggleStar={() => props.onToggleStar(file.id)}
      onHover={() => props.onActiveIndex(index)}
    />
  )

  if (groups) {
    let cursor = -1
    return (
      <>
        {groups.map((group) => (
          <section key={group.folder} className="file-group">
            <h3 className="group-label">
              <FolderOpen aria-hidden="true" />
              {group.label}
              <span className="count">{group.files.length}</span>
            </h3>
            <div role="list" aria-label={group.label}>
              {group.files.map((file) => {
                cursor = items.indexOf(file)
                return row(file, cursor)
              })}
            </div>
          </section>
        ))}
      </>
    )
  }

  return (
    <div role="list" aria-label="Markdown documents">
      {items.map(row)}
    </div>
  )
}
