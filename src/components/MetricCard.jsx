export default function MetricCard({ icon: Icon, label, value, tone = 'neutral', subtitle }) {
  const toneClasses = {
    alert: 'border-red-500/70 text-red-300',
    warning: 'border-orange-400/70 text-orange-300',
    neutral: 'border-slate-700 text-slate-200',
  }

  return (
    <article className={`rounded-xl border bg-slate-900/80 p-4 ${toneClasses[tone] ?? toneClasses.neutral}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
      </div>
    </article>
  )
}
