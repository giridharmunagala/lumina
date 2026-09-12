import {
  Command,
  Keyboard,
  ListTree,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Settings2,
  Star,
  Sun,
} from 'lucide-react'
import type { FileDocument } from '../lib/types'

export interface TopbarProps {
  document?: FileDocument
  progress: number
  sidebarCollapsed: boolean
  outlineVisible: boolean
  settingsOpen: boolean
  starred: boolean
  isDark: boolean
  onToggleSidebar: () => void
  onOpenMobileSidebar: () => void
  onToggleOutline: () => void
  onToggleSettings: () => void
  onToggleTheme: () => void
  onToggleStar: () => void
  onOpenPalette: () => void
  onOpenShortcuts: () => void
  onPrint: () => void
}

export function Topbar(props: TopbarProps) {
  return (
    <header className="topbar">
      <button
        className="icon-button desktop-only"
        onClick={props.onToggleSidebar}
        aria-label={props.sidebarCollapsed ? 'Show library' : 'Hide library'}
      >
        {props.sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </button>
      <button className="icon-button mobile-only" onClick={props.onOpenMobileSidebar} aria-label="Open library">
        <Menu />
      </button>

      <div className="topbar-title" title={props.document?.path}>
        {props.document ? props.document.title : 'Lumina Markdown reader'}
      </div>

      <div className="topbar-actions">
        <button className="quick-open" onClick={props.onOpenPalette} aria-label="Open command palette">
          <Command aria-hidden="true" />
          <span>Quick open</span>
          <kbd>Ctrl K</kbd>
        </button>
        {props.document && (
          <>
            <button
              className={`icon-button ${props.starred ? 'starred' : ''}`}
              onClick={props.onToggleStar}
              aria-pressed={props.starred}
              aria-label={props.starred ? 'Remove star' : 'Star document'}
            >
              <Star />
            </button>
            <button className="icon-button desktop-only" onClick={props.onPrint} aria-label="Print or save as PDF">
              <Printer />
            </button>
            <button
              className={`icon-button desktop-only ${props.outlineVisible ? 'on' : ''}`}
              onClick={props.onToggleOutline}
              aria-pressed={props.outlineVisible}
              aria-label={props.outlineVisible ? 'Hide outline' : 'Show outline'}
            >
              <ListTree />
            </button>
          </>
        )}
        <button className="icon-button" onClick={props.onToggleTheme} aria-label="Switch light or dark theme">
          {props.isDark ? <Sun /> : <Moon />}
        </button>
        <button className="icon-button desktop-only" onClick={props.onOpenShortcuts} aria-label="Keyboard shortcuts">
          <Keyboard />
        </button>
        <button
          className={`icon-button ${props.settingsOpen ? 'on' : ''}`}
          onClick={props.onToggleSettings}
          aria-label="Reading preferences"
          aria-expanded={props.settingsOpen}
        >
          <Settings2 />
        </button>
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(props.progress * 100)}
      >
        <span style={{ transform: `scaleX(${props.document ? props.progress : 0})` }} />
      </div>
    </header>
  )
}
