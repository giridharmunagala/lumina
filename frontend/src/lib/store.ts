import { documentTitle } from './format'
import type { SortOrder } from './preferences'
import type { MarkdownFile } from './types'

export const FAVOURITES_KEY = 'lumina.favorites.v1'
export const RECENTS_KEY = 'lumina.recents.v1'
export const LAST_DOCUMENT_KEY = 'lumina.last-document.v1'
export const RECENTS_LIMIT = 15

function readIds(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeIds(key: string, ids: string[]): void {
  localStorage.setItem(key, JSON.stringify(ids))
}

export function loadFavorites(): string[] {
  return readIds(FAVOURITES_KEY)
}

export function saveFavorites(ids: string[]): void {
  writeIds(FAVOURITES_KEY, ids)
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids]
}

export function loadRecents(): string[] {
  return readIds(RECENTS_KEY)
}

export function saveRecents(ids: string[]): void {
  writeIds(RECENTS_KEY, ids)
}

export function pushRecent(ids: string[], id: string): string[] {
  return [id, ...ids.filter((item) => item !== id)].slice(0, RECENTS_LIMIT)
}

export function loadLastDocument(): string | null {
  return localStorage.getItem(LAST_DOCUMENT_KEY)
}

export function saveLastDocument(id: string | null): void {
  if (id) localStorage.setItem(LAST_DOCUMENT_KEY, id)
  else localStorage.removeItem(LAST_DOCUMENT_KEY)
}

export function sortFiles<T extends MarkdownFile>(files: T[], order: SortOrder): T[] {
  const sorted = [...files]
  if (order === 'recent') {
    sorted.sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))
  } else if (order === 'name') {
    sorted.sort((a, b) => documentTitle(a).localeCompare(documentTitle(b), undefined, { sensitivity: 'base' }))
  } else {
    sorted.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }))
  }
  return sorted
}

export interface FileGroup<T> {
  folder: string
  label: string
  files: T[]
}

export function groupByFolder<T extends MarkdownFile>(files: T[]): FileGroup<T>[] {
  const groups = new Map<string, T[]>()
  for (const file of files) {
    const folder = file.folder
    const bucket = groups.get(folder)
    if (bucket) bucket.push(file)
    else groups.set(folder, [file])
  }
  return [...groups.entries()]
    .map(([folder, items]) => ({
      folder,
      label: folder || 'Top level',
      files: items,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function orderByIds<T extends MarkdownFile>(files: T[], ids: string[]): T[] {
  const byId = new Map(files.map((file) => [file.id, file]))
  return ids.map((id) => byId.get(id)).filter((file): file is T => Boolean(file))
}
