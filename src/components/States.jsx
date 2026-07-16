import { AlertTriangle, Loader2, Inbox, RefreshCw } from 'lucide-react'

export function LoadingState({ label = 'Loading live data…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center" role="status" aria-live="polite">
      <Loader2 className="h-7 w-7 animate-spin text-accent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center" role="alert">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger-ink">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="max-w-sm text-sm text-muted">
        We couldn’t load this data right now{message ? ` (${message})` : ''}.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg transition hover:border-accent-border"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-faint">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted">{hint}</p>}
    </div>
  )
}
