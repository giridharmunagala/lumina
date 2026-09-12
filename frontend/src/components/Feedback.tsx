import { AlertTriangle, type LucideIcon } from 'lucide-react'
import { ApiError } from '../lib/api'

function errorMessage(error: unknown): { message: string; detail?: string } {
  if (error instanceof ApiError) return { message: error.message, detail: error.detail }
  return { message: error instanceof Error ? error.message : 'Something unexpected happened.' }
}

export function ErrorNotice({
  error,
  retry,
  compact = false,
}: {
  error: unknown
  retry?: () => void
  compact?: boolean
}) {
  const info = errorMessage(error)
  return (
    <div className={`error-notice ${compact ? 'compact' : ''}`} role="alert">
      <span className="error-head">
        <AlertTriangle aria-hidden="true" />
        <strong>{info.message}</strong>
      </span>
      {info.detail && <span className="error-detail">{info.detail}</span>}
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint: string
}) {
  return (
    <div className="empty-list">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      <span>{hint}</span>
    </div>
  )
}
