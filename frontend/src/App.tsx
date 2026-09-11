import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Schema } from 'hast-util-sanitize'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { ApiError, api } from './api'
import { rehypeReader } from './markdown'
import {
  DEFAULT_PREFERENCES,
  type FontFamily,
  type Preferences,
  type Theme,
  loadPreferences,
  savePreferences,
} from './preferences'
import type { FileDocument, Heading, MarkdownFile, ScanStatus, SearchResult } from './types'

const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    input: [...(defaultSchema.attributes?.input ?? []), ['type', 'checkbox'], 'checked', 'disabled'],
  },
}

function errorMessage(error: unknown): { message: string; detail?: string } {
  if (error instanceof ApiError) return { message: error.message, detail: error.detail }
  return { message: error instanceof Error ? error.message : 'Something unexpected happened.' }
}

function ErrorNotice({
  error,
  retry,
  compact = false,
}: {
  error: unknown
  retry?: () => void
  compact?: boolean
}) {
  const info = errorMessage(error)
  return (
    <div className={`error-notice ${compact ? 'compact' : ''}`} role="alert">
      <strong>{info.message}</strong>
      {info.detail && <span>{info.detail}</span>}
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

function basename(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}

function relativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000)
  if (Math.abs(days) < 1) return 'Today'
  if (Math.abs(days) < 30) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(days, 'day')
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

interface SidebarProps {
  files: MarkdownFile[]
  results: SearchResult[] | null
  loading: boolean
  searching: boolean
  error: unknown
  selectedId?: string
  query: string
  status?: ScanStatus
  onQuery: (value: string) => void
  onSelect: (file: MarkdownFile) => void
  onRetry: () => void
  onScan: () => void
  onCloseMobile: () => void
}

function Sidebar(props: SidebarProps) {
  const items = props.results ?? props.files
  const searchRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    setActive(0)
  }, [items])

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => Math.min(items.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => Math.max(0, value - 1))
    } else if (event.key === 'Enter' && items[active]) {
      props.onSelect(items[active])
    } else if (event.key === 'Escape') {
      props.onQuery('')
      searchRef.current?.blur()
    }
  }

  return (
    <aside className="sidebar" aria-label="Document library">
      <div className="brand-row">
        <div className="brand"><BookOpen aria-hidden="true" /><span>Lumina</span></div>
        <button className="icon-button mobile-only" onClick={props.onCloseMobile} aria-label="Close library">
          <X />
        </button>
      </div>
      <label className="search-box">
        <Search aria-hidden="true" />
        <span className="sr-only">Search filename, path, and content</span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search library…"
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          onKeyDown={keyDown}
          aria-controls="file-list"
          aria-autocomplete="list"
        />
        {props.searching ? <span className="mini-spinner" aria-label="Searching" /> : <kbd>/</kbd>}
      </label>
      <div className="library-heading">
        <span>{props.query ? 'Search results' : 'Library'}</span>
        <span className="count">{items.length}</span>
      </div>
      <div className="file-list" id="file-list" role="listbox" aria-label="Markdown files">
        {props.loading && <Spinner label="Loading your library…" />}
        {Boolean(props.error) && <ErrorNotice error={props.error} retry={props.onRetry} compact />}
        {!props.loading && !props.error && items.length === 0 && (
          <div className="empty-list">
            <FileText aria-hidden="true" />
            <strong>{props.query ? 'No matches found' : 'Your library is empty'}</strong>
            <span>{props.query ? 'Try a filename, folder, or phrase.' : 'Scan a folder to discover Markdown files.'}</span>
          </div>
        )}
        {items.map((file, index) => (
          <button
            key={file.id}
            className={`file-item ${props.selectedId === file.id ? 'selected' : ''} ${active === index ? 'active' : ''}`}
            role="option"
            aria-selected={props.selectedId === file.id}
            onMouseEnter={() => setActive(index)}
            onClick={() => props.onSelect(file)}
          >
            <FileText aria-hidden="true" />
            <span className="file-copy">
              <strong>{file.title || basename(file.name || file.path).replace(/\.md(?:own)?$/i, '')}</strong>
              <span>{file.path}</span>
              {'excerpt' in file && typeof file.excerpt === 'string' && <small>{file.excerpt}</small>}
            </span>
            <span className="file-date">{relativeTime(file.modifiedAt)}</span>
          </button>
        ))}
      </div>
      <div className="scan-row">
        <span className={`status-dot ${props.status?.state === 'scanning' ? 'scanning' : ''}`} />
        <span>
          {props.status?.state === 'scanning'
            ? `Indexing ${props.status.indexed}${props.status.total ? ` / ${props.status.total}` : ''}`
            : `${props.status?.indexed ?? props.files.length} documents indexed`}
        </span>
        <button
          className="icon-button"
          onClick={props.onScan}
          disabled={props.status?.state === 'scanning'}
          aria-label="Rescan library"
        >
          <RefreshCw className={props.status?.state === 'scanning' ? 'spin' : ''} />
        </button>
      </div>
      {props.status?.error && <div className="scan-error" role="alert">{props.status.error}</div>}
    </aside>
  )
}

function Settings({
  value,
  onChange,
  onClose,
}: {
  value: Preferences
  onChange: (next: Preferences) => void
  onClose: () => void
}) {
  const set = <K extends keyof Preferences>(key: K, next: Preferences[K]) =>
    onChange({ ...value, [key]: next })
  return (
    <div className="settings-panel" role="dialog" aria-modal="false" aria-labelledby="settings-title">
      <div className="settings-title">
        <strong id="settings-title">Reading preferences</strong>
        <button className="icon-button" onClick={onClose} aria-label="Close preferences"><X /></button>
      </div>
      <label>Theme
        <select value={value.theme} onChange={(event) => set('theme', event.target.value as Theme)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="solarized-dark">Solarized Dark</option>
          <option value="solarized-light">Solarized Light</option>
        </select>
      </label>
      <label>Typeface
        <select value={value.fontFamily} onChange={(event) => set('fontFamily', event.target.value as FontFamily)}>
          <option value="serif">Literary serif</option>
          <option value="sans">Clean sans</option>
          <option value="mono">Monospace</option>
        </select>
      </label>
      <Range label="Font size" value={value.fontSize} min={14} max={28} unit="px" onChange={(v) => set('fontSize', v)} />
      <Range label="Line height" value={value.lineHeight} min={1.35} max={2.1} step={0.05} onChange={(v) => set('lineHeight', v)} />
      <Range label="Content width" value={value.contentWidth} min={560} max={1100} step={20} unit="px" onChange={(v) => set('contentWidth', v)} />
      <Range label="Sidebar width" value={value.sidebarWidth} min={240} max={480} step={10} unit="px" onChange={(v) => set('sidebarWidth', v)} />
      <button className="reset-button" onClick={() => onChange(DEFAULT_PREFERENCES)}>Reset to defaults</button>
    </div>
  )
}

function Range({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void
}) {
  return (
    <label>
      <span className="range-title"><span>{label}</span><output>{value}{unit}</output></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

function Outline({ headings }: { headings: Heading[] }) {
  if (!headings.length) return <div className="outline-empty">No headings in this document.</div>
  return (
    <nav className="outline-nav" aria-label="On this page">
      {headings.map((heading) => (
        <a key={heading.id} href={`#${heading.id}`} style={{ '--level': heading.level } as CSSProperties}>
          {heading.text}
        </a>
      ))}
    </nav>
  )
}

function Reader({
  document,
  loading,
  error,
  onRetry,
  headings,
  contentRef,
}: {
  document?: FileDocument
  loading: boolean
  error: unknown
  onRetry: () => void
  headings: Heading[]
  contentRef: React.RefObject<HTMLDivElement>
}) {
  if (loading) return <main className="center-state"><Spinner label="Opening document…" /></main>
  if (error) return <main className="center-state"><ErrorNotice error={error} retry={onRetry} /></main>
  if (!document) {
    return (
      <main className="welcome-state">
        <div className="welcome-icon"><BookOpen /></div>
        <p className="eyebrow">YOUR LOCAL READING SPACE</p>
        <h1>Read deeply.<br />Stay focused.</h1>
        <p>Select a Markdown document from your library to begin. Press <kbd>/</kbd> to search instantly.</p>
      </main>
    )
  }

  const words = document.wordCount ?? document.content.trim().split(/\s+/).filter(Boolean).length
  return (
    <main className="reader-scroll" tabIndex={-1}>
      <article className="reader-article">
        <header className="document-header">
          <div className="document-path">{document.path}</div>
          <h1>{document.title || basename(document.name || document.path).replace(/\.md(?:own)?$/i, '')}</h1>
          <div className="metadata" aria-label="Document metadata">
            <span>{words.toLocaleString()} words</span>
            <span>~{Math.max(1, Math.ceil(words / 220))} min read</span>
            <span>Updated {relativeTime(document.modifiedAt)}</span>
          </div>
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
          >
            {document.content}
          </ReactMarkdown>
        </div>
        <footer className="document-footer">End of document · {headings.length} sections</footer>
      </article>
    </main>
  )
}

export function App() {
  const [preferences, setPreferences] = useState(loadPreferences)
  const [files, setFiles] = useState<MarkdownFile[]>([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [filesError, setFilesError] = useState<unknown>()
  const [selectedId, setSelectedId] = useState<string>()
  const [currentDocument, setDocument] = useState<FileDocument>()
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState<unknown>()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<unknown>()
  const [searchVersion, setSearchVersion] = useState(0)
  const [status, setStatus] = useState<ScanStatus>()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [headings, setHeadings] = useState<Heading[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const loadFiles = useCallback(async () => {
    setFilesLoading(true)
    setFilesError(undefined)
    try {
      setFiles(await api.files())
    } catch (error) {
      setFilesError(error)
    } finally {
      setFilesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFiles()
    api.scanStatus().then(setStatus).catch(() => undefined)
  }, [loadFiles])

  useEffect(() => {
    savePreferences(preferences)
    window.document.documentElement.dataset.theme = preferences.theme
  }, [preferences])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setSearching(false)
      setSearchError(undefined)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError(undefined)
      try {
        const next = await api.search(query.trim())
        if (!cancelled) setResults(next)
      } catch (error) {
        if (!cancelled) {
          setResults(null)
          setSearchError(error)
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, searchVersion])

  useEffect(() => {
    if (!currentDocument || !contentRef.current) {
      setHeadings([])
      return
    }
    const found = Array.from(contentRef.current.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')).map((node) => ({
      id: node.id,
      text: node.textContent?.trim() ?? '',
      level: Number(node.tagName.slice(1)),
    }))
    setHeadings(found)
  }, [currentDocument])

  const openFile = useCallback(async (file: MarkdownFile) => {
    setSelectedId(file.id)
    setDocumentLoading(true)
    setDocumentError(undefined)
    setMobileOpen(false)
    try {
      setDocument(await api.file(file.id))
      requestAnimationFrame(() => window.document.querySelector<HTMLElement>('.reader-scroll')?.focus())
    } catch (error) {
      setDocument(undefined)
      setDocumentError(error)
    } finally {
      setDocumentLoading(false)
    }
  }, [])

  const scan = async () => {
    try {
      setStatus(await api.scan())
      await loadFiles()
      setStatus(await api.scanStatus())
    } catch (error) {
      const info = errorMessage(error)
      setStatus({ state: 'error', indexed: status?.indexed ?? files.length, error: [info.message, info.detail].filter(Boolean).join(' ') })
    }
  }

  const submitSearch = (event: FormEvent) => event.preventDefault()
  const style = useMemo(() => ({
    '--sidebar-width': `${preferences.sidebarWidth}px`,
    '--reader-width': `${preferences.contentWidth}px`,
    '--reader-size': `${preferences.fontSize}px`,
    '--reader-leading': preferences.lineHeight,
    '--reader-font': preferences.fontFamily === 'serif'
      ? 'var(--font-serif)'
      : preferences.fontFamily === 'mono' ? 'var(--font-mono)' : 'var(--font-sans)',
  }) as CSSProperties, [preferences])

  return (
    <div className={`app-shell ${preferences.sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={style}>
      <a className="skip-link" href="#reader-content">Skip to document</a>
      <div className={`sidebar-wrap ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          files={files}
          results={results}
          loading={filesLoading}
          searching={searching}
          error={query ? searchError : filesError}
          selectedId={selectedId}
          query={query}
          status={status}
          onQuery={setQuery}
          onSelect={openFile}
          onRetry={query ? () => setSearchVersion((value) => value + 1) : loadFiles}
          onScan={() => void scan()}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close library" />}
      <section className="main-pane" id="reader-content">
        <header className="topbar">
          <button className="icon-button desktop-only" onClick={() => setPreferences({ ...preferences, sidebarCollapsed: !preferences.sidebarCollapsed })} aria-label={preferences.sidebarCollapsed ? 'Expand library' : 'Collapse library'}>
            {preferences.sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button className="icon-button mobile-only" onClick={() => setMobileOpen(true)} aria-label="Open library"><Menu /></button>
          <div className="topbar-title">{currentDocument ? (currentDocument.title || basename(currentDocument.name)) : 'Markdown reader'}</div>
          <div className="topbar-actions">
            {currentDocument && (
              <button className={`outline-toggle ${preferences.outlineVisible ? 'active' : ''}`} onClick={() => setPreferences({ ...preferences, outlineVisible: !preferences.outlineVisible })}>
                <span>Outline</span>
                {preferences.outlineVisible ? <ChevronRight /> : <ChevronLeft />}
              </button>
            )}
            <button className="icon-button" onClick={() => setSettingsOpen(!settingsOpen)} aria-label="Reading preferences" aria-expanded={settingsOpen}><Settings2 /></button>
          </div>
          {settingsOpen && <Settings value={preferences} onChange={setPreferences} onClose={() => setSettingsOpen(false)} />}
        </header>
        <div className={`reading-layout ${preferences.outlineVisible && currentDocument ? 'has-outline' : ''}`}>
          <Reader document={currentDocument} loading={documentLoading} error={documentError} onRetry={() => {
            const file = files.find((item) => item.id === selectedId)
            if (file) void openFile(file)
          }} headings={headings} contentRef={contentRef} />
          {preferences.outlineVisible && currentDocument && (
            <aside className="outline">
              <div className="outline-label">ON THIS PAGE</div>
              <Outline headings={headings} />
            </aside>
          )}
        </div>
      </section>
      <form onSubmit={submitSearch} className="sr-only" aria-hidden="true" />
    </div>
  )
}
