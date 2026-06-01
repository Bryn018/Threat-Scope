export default function KpiCard({ icon: Icon, label, value, tone = 'default', className = '' }) {
  const toneStyles = {
    default: 'border-slate-800 bg-slate-900/60 text-slate-100',
    alert: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  }[tone] ?? 'border-slate-800 bg-slate-900/60 text-slate-100'

  return (
    <div className={`rounded-2xl border p-4 ${toneStyles} ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : null}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
