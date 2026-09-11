export interface MarkdownFile {
  id: string
  name: string
  path: string
  size: number
  modifiedAt: string
  title?: string
  wordCount?: number
  content?: string
}

export interface FileDocument extends MarkdownFile {
  content: string
  createdAt?: string
}

export interface SearchResult extends MarkdownFile {
  excerpt?: string
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
