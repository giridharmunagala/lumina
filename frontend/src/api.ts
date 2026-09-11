import type { FileDocument, MarkdownFile, ScanStatus, SearchResult } from './types'

interface BackendFile {
  id: string
  name: string
  relative_path: string
  root: string
  size: number
  modified_at: string
  content?: string
  match_type?: 'filename' | 'path' | 'content'
  snippet?: string | null
}

interface BackendStatus {
  state: 'idle' | 'scanning' | 'error'
  indexed_files: number
  started_at: string | null
  completed_at: string | null
  error: string | null
}

interface ScanAccepted {
  accepted: boolean
  status: BackendStatus
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    })
  } catch (error) {
    throw new ApiError(
      'Could not reach the Markdown service.',
      0,
      error instanceof Error ? error.message : undefined,
    )
  }

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as {
        detail?: unknown
        message?: unknown
        error?: { message?: unknown; details?: unknown }
      }
      detail = String(body.error?.message ?? body.detail ?? body.message ?? detail)
    } catch {
      const text = await response.text()
      if (text) detail = text
    }
    throw new ApiError(`Backend request failed (${response.status}).`, response.status, detail)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function unwrap<T>(value: T[] | { items: T[] }): T[] {
  return Array.isArray(value) ? value : value.items
}

function mapFile(file: BackendFile): MarkdownFile {
  return {
    id: file.id,
    name: file.name,
    path: file.relative_path,
    size: file.size,
    modifiedAt: file.modified_at,
  }
}

function mapDocument(file: BackendFile): FileDocument {
  return { ...mapFile(file), content: file.content ?? '' }
}

function mapResult(file: BackendFile): SearchResult {
  return { ...mapFile(file), excerpt: file.snippet ?? undefined }
}

function mapStatus(status: BackendStatus): ScanStatus {
  return {
    state: status.state,
    indexed: status.indexed_files,
    updatedAt: status.completed_at ?? status.started_at ?? undefined,
    error: status.error ?? undefined,
  }
}

export const api = {
  async files(): Promise<MarkdownFile[]> {
    const files = unwrap(
      await request<BackendFile[] | { items: BackendFile[] }>('/api/library/files'),
    )
    return files.map(mapFile)
  },
  async file(id: string): Promise<FileDocument> {
    return mapDocument(await request<BackendFile>(`/api/files/${encodeURIComponent(id)}`))
  },
  async search(query: string): Promise<SearchResult[]> {
    const value = await request<BackendFile[] | { items: BackendFile[] }>(
      `/api/search?q=${encodeURIComponent(query)}`,
    )
    return unwrap(value).map(mapResult)
  },
  async scanStatus(): Promise<ScanStatus> {
    return mapStatus(await request<BackendStatus>('/api/status'))
  },
  async scan(): Promise<ScanStatus> {
    const response = await request<ScanAccepted>('/api/rescan', { method: 'POST' })
    return mapStatus(response.status)
  },
}

export function localImageUrl(fileId: string, source: string): string {
  const params = new URLSearchParams({ path: source })
  return `/api/files/${encodeURIComponent(fileId)}/images?${params}`
}
