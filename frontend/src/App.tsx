import { Copy, Eye, ListTree, Moon, PanelLeft, Printer, RefreshCw } from 'lucide-react'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CommandPalette, type Command } from './components/CommandPalette'
import { Outline } from './components/Outline'
import { Reader } from './components/Reader'
import { SettingsPanel } from './components/SettingsPanel'
import { ShortcutsDialog } from './components/ShortcutsDialog'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { useLibrary, usePersistentIds, useSearch } from './hooks/useLibrary'
import { useHeadings, useReadingPosition } from './hooks/useReadingPosition'
import { useShortcuts } from './hooks/useShortcuts'
import { api } from './lib/api'
import {
  type Preferences,
  fontStack,
  loadPreferences,
  resolveTheme,
  savePreferences,
} from './lib/preferences'
import {
  loadFavorites,
  loadLastDocument,
  loadRecents,
  pushRecent,
  saveFavorites,
  saveLastDocument,
  saveRecents,
  toggleId,
} from './lib/store'
import type { FileDocument, MarkdownFile } from './lib/types'

export function App() {
  const [preferences, setPreferences] = useState(loadPreferences)
  const [selectedId, setSelectedId] = useState<string>()
  const [currentDocument, setCurrentDocument] = useState<FileDocument>()
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentError, setDocumentError] = useState<unknown>()
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState('')

  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const restored = useRef(false)

  const library = useLibrary()
  const search = useSearch(query)
  const [favorites, setFavorites] = usePersistentIds(loadFavorites, saveFavorites)
  const [recents, setRecents] = usePersistentIds(loadRecents, saveRecents)

  const headings = useHeadings(contentRef, currentDocument?.id)
  const { progress, activeId } = useReadingPosition(scrollRef, headings)

  const update = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
      setPreferences((current) => ({ ...current, [key]: value })),
    [],
  )

  const notify = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }, [])

  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  const resolvedTheme = resolveTheme(preferences.theme)
  useEffect(() => {
    window.document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    if (preferences.theme !== 'system' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      window.document.documentElement.dataset.theme = media.matches ? 'dark' : 'light'
    }
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [preferences.theme])

  const openFile = useCallback(
    async (file: MarkdownFile) => {
      setSelectedId(file.id)
      setDocumentLoading(true)
      setDocumentError(undefined)
      setMobileOpen(false)
      try {
        const loaded = await api.file(file.id)
        setCurrentDocument(loaded)
        setRecents(pushRecent(loadRecents(), file.id))
        saveLastDocument(file.id)
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: 0 })
          scrollRef.current?.focus()
        })
      } catch (error) {
        setCurrentDocument(undefined)
        setDocumentError(error)
      } finally {
        setDocumentLoading(false)
      }
    },
    [setRecents],
  )

  useEffect(() => {
    if (restored.current || !library.files.length) return
    restored.current = true
    const last = loadLastDocument()
    const file = last ? library.files.find((item) => item.id === last) : undefined
    if (file) void openFile(file)
  }, [library.files, openFile])

  const toggleStar = useCallback(
    (id: string) => {
      const next = toggleId(loadFavorites(), id)
      setFavorites(next)
      notify(next.includes(id) ? 'Starred' : 'Removed star')
    },
    [notify, setFavorites],
  )

  const toggleTheme = useCallback(() => {
    update('theme', resolveTheme(preferences.theme) === 'dark' ? 'light' : 'dark')
  }, [preferences.theme, update])

  const copyPath = useCallback(() => {
    if (!currentDocument) return
    void navigator.clipboard
      .writeText(currentDocument.path)
      .then(() => notify('Path copied'))
      .catch(() => notify('Could not copy path'))
  }, [currentDocument, notify])

  const scrollToHeading = useCallback((id: string) => {
    const target = window.document.getElementById(id)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  const closeOverlays = useCallback(() => {
    setPaletteOpen(false)
    setShortcutsOpen(false)
    setSettingsOpen(false)
  }, [])

  useShortcuts([
    { key: 'k', mod: true, run: () => setPaletteOpen((open) => !open) },
    { key: 'p', mod: true, shift: true, run: () => setPaletteOpen(true) },
    {
      key: '/',
      run: () => {
        setMobileOpen(true)
        window.dispatchEvent(new Event('lumina:focus-search'))
      },
    },
    { key: 'b', run: () => update('sidebarCollapsed', !preferences.sidebarCollapsed) },
    { key: 'o', run: () => update('outlineVisible', !preferences.outlineVisible) },
    { key: 'f', run: () => update('focusMode', !preferences.focusMode) },
    { key: 't', run: toggleTheme },
    { key: 'r', run: () => void library.scan() },
    { key: 's', run: () => currentDocument && toggleStar(currentDocument.id) },
    { key: '?', shift: true, run: () => setShortcutsOpen((open) => !open) },
    { key: 'escape', run: closeOverlays },
  ])

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'theme',
        label: `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`,
        hint: 'T',
        icon: <Moon aria-hidden="true" />,
        run: toggleTheme,
      },
      {
        id: 'focus',
        label: preferences.focusMode ? 'Leave focus mode' : 'Enter focus mode',
        hint: 'F',
        icon: <Eye aria-hidden="true" />,
        run: () => update('focusMode', !preferences.focusMode),
      },
      {
        id: 'outline',
        label: preferences.outlineVisible ? 'Hide outline' : 'Show outline',
        hint: 'O',
        icon: <ListTree aria-hidden="true" />,
        run: () => update('outlineVisible', !preferences.outlineVisible),
      },
      {
        id: 'sidebar',
        label: preferences.sidebarCollapsed ? 'Show library' : 'Hide library',
        hint: 'B',
        icon: <PanelLeft aria-hidden="true" />,
        run: () => update('sidebarCollapsed', !preferences.sidebarCollapsed),
      },
      {
        id: 'rescan',
        label: 'Rescan library',
        hint: 'R',
        icon: <RefreshCw aria-hidden="true" />,
        run: () => void library.scan(),
      },
      ...(currentDocument
        ? [
            {
              id: 'copy-path',
              label: 'Copy document path',
              icon: <Copy aria-hidden="true" />,
              run: copyPath,
            },
            {
              id: 'print',
              label: 'Print or save as PDF',
              icon: <Printer aria-hidden="true" />,
              run: () => window.print(),
            },
          ]
        : []),
    ],
    [copyPath, currentDocument, library, preferences, resolvedTheme, toggleTheme, update],
  )

  const style = useMemo(
    () =>
      ({
        '--sidebar-width': `${preferences.sidebarWidth}px`,
        '--reader-width': `${preferences.contentWidth}px`,
        '--reader-size': `${preferences.fontSize}px`,
        '--reader-leading': preferences.lineHeight,
        '--reader-font': fontStack(preferences.fontFamily),
      }) as CSSProperties,
    [preferences],
  )

  const outlineVisible = preferences.outlineVisible && !preferences.focusMode && Boolean(currentDocument)
  const sidebarHidden = preferences.sidebarCollapsed || preferences.focusMode

  return (
    <div
      className={`app-shell ${sidebarHidden ? 'sidebar-collapsed' : ''} ${preferences.focusMode ? 'focus-mode' : ''}`}
      style={style}
    >
      <a className="skip-link" href="#reader-content">
        Skip to document
      </a>

      <div className={`sidebar-wrap ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          files={library.files}
          results={search.results}
          favorites={favorites}
          recents={recents}
          loading={library.loading}
          searching={search.searching}
          error={query ? search.error : library.error}
          selectedId={selectedId}
          query={query}
          sort={preferences.sort}
          grouped={preferences.groupByFolder}
          status={library.status}
          onQuery={setQuery}
          onSort={(value) => update('sort', value)}
          onToggleGrouping={() => update('groupByFolder', !preferences.groupByFolder)}
          onSelect={(file) => void openFile(file)}
          onToggleStar={toggleStar}
          onRetry={query ? search.retry : () => void library.reload()}
          onScan={() => void library.scan()}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </div>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close library" />}

      <section className="main-pane" id="reader-content">
        <Topbar
          document={currentDocument}
          progress={progress}
          sidebarCollapsed={preferences.sidebarCollapsed}
          outlineVisible={preferences.outlineVisible}
          settingsOpen={settingsOpen}
          starred={Boolean(currentDocument && favorites.includes(currentDocument.id))}
          isDark={resolvedTheme !== 'light' && resolvedTheme !== 'sepia' && resolvedTheme !== 'solarized-light'}
          onToggleSidebar={() => update('sidebarCollapsed', !preferences.sidebarCollapsed)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onToggleOutline={() => update('outlineVisible', !preferences.outlineVisible)}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          onToggleTheme={toggleTheme}
          onToggleStar={() => currentDocument && toggleStar(currentDocument.id)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onPrint={() => window.print()}
        />
        {settingsOpen && (
          <SettingsPanel
            value={preferences}
            onChange={setPreferences}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        <div className={`reading-layout ${outlineVisible ? 'has-outline' : ''}`}>
          <Reader
            document={currentDocument}
            loading={documentLoading}
            error={documentError}
            onRetry={() => {
              const file = library.files.find((item) => item.id === selectedId)
              if (file) void openFile(file)
            }}
            headings={headings}
            contentRef={contentRef}
            scrollRef={scrollRef}
            justify={preferences.justifyText}
          />
          {outlineVisible && (
            <aside className="outline" aria-label="Document outline">
              <div className="outline-label">On this page</div>
              <Outline headings={headings} activeId={activeId} onNavigate={scrollToHeading} />
            </aside>
          )}
        </div>
      </section>

      {paletteOpen && (
        <CommandPalette
          files={library.files}
          commands={commands}
          onOpenFile={(file) => void openFile(file)}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
