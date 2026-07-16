export default function KpiCard({ icon: Icon, label, value, tone = 'default', className = '', onClick }) {
  const toneStyles = {
    default: 'border-border bg-surface-2/60 text-fg',
    alert: 'border-rose-500/40 bg-danger-soft text-danger-ink',
    warning: 'border-amber-500/40 bg-warning-soft text-warning-ink',
  }[tone] ?? 'border-border bg-surface-2/60 text-fg'

  return (
    <div
      className={`rounded-2xl border p-4 ${toneStyles} ${className} ${onClick ? 'cursor-pointer transition hover:border-border/40' : ''}`}
      {...(onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (event) => { if (event.key === 'Enter') onClick() } } : {})}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
