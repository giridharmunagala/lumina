import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { MarkdownFile, ScanStatus, SearchResult } from '../lib/types'

export function useLibrary() {
  const [files, setFiles] = useState<MarkdownFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>()
  const [status, setStatus] = useState<ScanStatus>()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setFiles(await api.files())
    } catch (caught) {
      setError(caught)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.scanStatus())
    } catch {
      /* status is advisory only */
    }
  }, [])

  useEffect(() => {
    void reload()
    void refreshStatus()
  }, [reload, refreshStatus])

  const scan = useCallback(async () => {
    try {
      setStatus(await api.scan())
      await reload()
      await refreshStatus()
    } catch (caught) {
      setStatus((previous) => ({
        state: 'error',
        indexed: previous?.indexed ?? 0,
        error: caught instanceof Error ? caught.message : 'Rescan failed.',
      }))
    }
  }, [refreshStatus, reload])

  return { files, loading, error, status, reload, scan }
}

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<unknown>()
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setSearching(false)
      setError(undefined)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setError(undefined)
      try {
        const next = await api.search(query.trim())
        if (!cancelled) setResults(next)
      } catch (caught) {
        if (!cancelled) {
          setResults(null)
          setError(caught)
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, attempt])

  return { results, searching, error, retry }
}

/** Persist a value in localStorage without losing the initial read on mount. */
export function usePersistentIds(
  load: () => string[],
  save: (ids: string[]) => void,
): [string[], (next: string[]) => void] {
  const [ids, setIds] = useState<string[]>(load)
  const saveRef = useRef(save)
  saveRef.current = save
  const update = useCallback((next: string[]) => {
    setIds(next)
    saveRef.current(next)
  }, [])
  return [ids, update]
}
