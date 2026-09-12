import { useEffect, useRef } from 'react'

export interface Shortcut {
  /** Lowercase key, e.g. "k" or "/". */
  key: string
  mod?: boolean
  shift?: boolean
  run: (event: KeyboardEvent) => void
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

/** Register global keyboard shortcuts; plain-key shortcuts are ignored while typing. */
export function useShortcuts(shortcuts: Shortcut[]): void {
  const ref = useRef(shortcuts)
  ref.current = shortcuts

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey
      for (const shortcut of ref.current) {
        if (event.key.toLowerCase() !== shortcut.key) continue
        if (Boolean(shortcut.mod) !== modifier) continue
        if (shortcut.shift !== undefined && shortcut.shift !== event.shiftKey) continue
        if (!shortcut.mod && isTyping(event.target) && event.key !== 'Escape') continue
        event.preventDefault()
        shortcut.run(event)
        return
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])
}
