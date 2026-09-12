export type MatchType = 'filename' | 'path' | 'content'

export interface MarkdownFile {
  id: string
  name: string
  path: string
  folder: string
  size: number
  modifiedAt: string
  createdAt?: string
  title: string
  tags: string[]
  wordCount: number
}

export interface FileDocument extends MarkdownFile {
  content: string
}

export interface SearchResult extends MarkdownFile {
  excerpt?: string
  matchType?: MatchType
  matches?: number
}

export interface ScanStatus {
  state: 'idle' | 'scanning' | 'complete' | 'error'
  indexed: number
  total?: number
  updatedAt?: string
  error?: string
}

export interface Heading {
  id: string
  text: string
  level: number
}
