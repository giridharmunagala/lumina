import { useEffect, useState } from 'react'

/** Track the theme currently applied to the document element. */
export function useDocumentTheme(): string {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'dark')
  useEffect(() => {
    const target = document.documentElement
    const observer = new MutationObserver(() => setTheme(target.dataset.theme ?? 'dark'))
    observer.observe(target, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return theme
}
