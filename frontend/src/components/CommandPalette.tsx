import { CornerDownLeft, FileText, Search, Zap } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyFilter } from '../lib/fuzzy'
import type { MarkdownFile } from '../lib/types'

export interface Command {
  id: string
  label: string
  hint?: string
  icon?: ReactNode
  run: () => void
}

interface Entry {
  key: string
  label: string
  detail: string
  kind: 'document' | 'command'
  icon?: ReactNode
  run: () => void
}

export function CommandPalette({
  files,
  commands,
  onOpenFile,
  onClose,
}: {
  files: MarkdownFile[]
  commands: Command[]
  onOpenFile: (file: MarkdownFile) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo<Entry[]>(() => {
    const commandEntries: Entry[] = commands.map((command) => ({
      key: `command:${command.id}`,
      label: command.label,
      detail: command.hint ?? 'Command',
      kind: 'command',
      icon: command.icon ?? <Zap aria-hidden="true" />,
      run: command.run,
    }))
    const documentEntries: Entry[] = files.map((file) => ({
      key: `file:${file.id}`,
      label: file.title,
      detail: file.path,
      kind: 'document',
      icon: <FileText aria-hidden="true" />,
      run: () => onOpenFile(file),
    }))
    const matchedCommands = fuzzyFilter(commandEntries, query, (entry) => entry.label, 8)
    const matchedDocuments = fuzzyFilter(
      documentEntries,
      query,
      (entry) => `${entry.label} ${entry.detail}`,
      query.trim() ? 30 : 8,
    )
    return query.trim() ? [...matchedCommands, ...matchedDocuments] : [...matchedDocuments, ...matchedCommands]
  }, [commands, files, onOpenFile, query])

  useEffect(() => {
    setIndex(0)
  }, [query])

  useEffect(() => {
    listRef.current?.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const keyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIndex((value) => (value + 1) % Math.max(1, entries.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIndex((value) => (value - 1 + entries.length) % Math.max(1, entries.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const entry = entries[index]
      if (entry) {
        entry.run()
        onClose()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-search">
          <Search aria-hidden="true" />
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Jump to a document or run a command…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={keyDown}
            aria-label="Search documents and commands"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef} role="listbox" aria-label="Results">
          {!entries.length && <p className="palette-empty">No matches.</p>}
          {entries.map((entry, position) => (
            <button
              key={entry.key}
              role="option"
              aria-selected={position === index}
              className={`palette-item ${position === index ? 'active' : ''}`}
              onMouseEnter={() => setIndex(position)}
              onClick={() => {
                entry.run()
                onClose()
              }}
            >
              <span className="palette-icon">{entry.icon}</span>
              <span className="palette-copy">
                <strong>{entry.label}</strong>
                <span>{entry.detail}</span>
              </span>
              {position === index && <CornerDownLeft aria-hidden="true" className="palette-enter" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
