import { X } from 'lucide-react'
import { useEffect } from 'react'

const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Ctrl', 'K'], description: 'Open the command palette' },
  { keys: ['/'], description: 'Focus library search' },
  { keys: ['↑', '↓', 'Enter'], description: 'Move through results and open' },
  { keys: ['B'], description: 'Show or hide the library' },
  { keys: ['O'], description: 'Show or hide the outline' },
  { keys: ['F'], description: 'Toggle focus mode' },
  { keys: ['T'], description: 'Switch between light and dark' },
  { keys: ['S'], description: 'Star or unstar the open document' },
  { keys: ['R'], description: 'Rescan the library' },
  { keys: ['?'], description: 'Show this list' },
  { keys: ['Esc'], description: 'Close dialogs and clear search' },
]

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onClose])

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="shortcuts"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-title">
          <strong id="shortcuts-title">Keyboard shortcuts</strong>
          <button className="icon-button" onClick={onClose} aria-label="Close shortcuts">
            <X />
          </button>
        </div>
        <dl>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.description}>
              <dt>
                {shortcut.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dt>
              <dd>{shortcut.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
