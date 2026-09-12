import { BookOpen, Clock, FolderTree, Layers, RefreshCw, Search, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SORT_ORDERS, type SortOrder } from '../lib/preferences'
import type { MarkdownFile, ScanStatus, SearchResult } from '../lib/types'
import { LibraryList, type LibraryTab } from './LibraryList'

const TABS: { value: LibraryTab; label: string; icon: typeof Layers }[] = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'recent', label: 'Recent', icon: Clock },
  { value: 'starred', label: 'Starred', icon: Star },
]

export interface SidebarProps {
  files: MarkdownFile[]
  results: SearchResult[] | null
  favorites: string[]
  recents: string[]
  loading: boolean
  searching: boolean
  error: unknown
  selectedId?: string
  query: string
  sort: SortOrder
  grouped: boolean
  status?: ScanStatus
  onQuery: (value: string) => void
  onSort: (value: SortOrder) => void
  onToggleGrouping: () => void
  onSelect: (file: MarkdownFile) => void
  onToggleStar: (id: string) => void
  onRetry: () => void
  onScan: () => void
  onCloseMobile: () => void
}

export function Sidebar(props: SidebarProps) {
  const [tab, setTab] = useState<LibraryTab>('all')
  const [items, setItems] = useState<MarkdownFile[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const scanning = props.status?.state === 'scanning'

  useEffect(() => {
    setActiveIndex(0)
  }, [items])

  useEffect(() => {
    const focus = () => searchRef.current?.focus()
    window.addEventListener('lumina:focus-search', focus)
    return () => window.removeEventListener('lumina:focus-search', focus)
  }, [])

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((value) => Math.min(items.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((value) => Math.max(0, value - 1))
    } else if (event.key === 'Enter' && items[activeIndex]) {
      props.onSelect(items[activeIndex])
    } else if (event.key === 'Escape') {
      props.onQuery('')
      searchRef.current?.blur()
    }
  }

  return (
    <aside className="sidebar" aria-label="Document library">
      <div className="brand-row">
        <div className="brand">
          <BookOpen aria-hidden="true" />
          <span>Lumina</span>
        </div>
        <button className="icon-button mobile-only" onClick={props.onCloseMobile} aria-label="Close library">
          <X />
        </button>
      </div>

      <label className="search-box">
        <Search aria-hidden="true" />
        <span className="sr-only">Search titles, paths, and content</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search library…"
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          onKeyDown={keyDown}
          aria-controls="file-list"
        />
        {props.searching ? <span className="mini-spinner" aria-label="Searching" /> : <kbd>/</kbd>}
      </label>

      {!props.query && (
        <div className="tabs" role="tablist" aria-label="Library view">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={`tab ${tab === value ? 'on' : ''}`}
              onClick={() => setTab(value)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="library-heading">
        <span>{props.query ? 'Results' : 'Documents'}</span>
        <span className="count">{items.length}</span>
        {!props.query && tab === 'all' && (
          <>
            <button
              className={`chip-button ${props.grouped ? 'on' : ''}`}
              onClick={props.onToggleGrouping}
              aria-pressed={props.grouped}
              title="Group by folder"
            >
              <FolderTree aria-hidden="true" />
            </button>
            <label className="sort-select">
              <span className="sr-only">Sort documents</span>
              <select value={props.sort} onChange={(event) => props.onSort(event.target.value as SortOrder)}>
                {SORT_ORDERS.map((order) => (
                  <option key={order.value} value={order.value}>
                    {order.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      <div className="file-list" id="file-list">
        <LibraryList
          files={props.files}
          results={props.results}
          favorites={props.favorites}
          recents={props.recents}
          tab={tab}
          query={props.query}
          sort={props.sort}
          grouped={props.grouped}
          loading={props.loading}
          error={props.error}
          selectedId={props.selectedId}
          activeIndex={activeIndex}
          onActiveIndex={setActiveIndex}
          onItems={setItems}
          onSelect={props.onSelect}
          onToggleStar={props.onToggleStar}
          onRetry={props.onRetry}
        />
      </div>

      <div className="scan-row">
        <span className={`status-dot ${scanning ? 'scanning' : ''}`} aria-hidden="true" />
        <span>
          {scanning
            ? `Indexing ${props.status?.indexed ?? 0}…`
            : `${props.status?.indexed ?? props.files.length} documents indexed`}
        </span>
        <button className="icon-button" onClick={props.onScan} disabled={scanning} aria-label="Rescan library">
          <RefreshCw className={scanning ? 'spin' : ''} />
        </button>
      </div>
      {props.status?.error && (
        <div className="scan-error" role="alert">
          {props.status.error}
        </div>
      )}
    </aside>
  )
}
