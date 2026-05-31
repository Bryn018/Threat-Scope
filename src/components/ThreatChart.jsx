import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#f97316', '#fb7185', '#38bdf8', '#a78bfa', '#2dd4bf', '#64748b']

export default function ThreatChart({ data }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Threat Breakdown by Vendor</h2>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No chart data available.</p>
      ) : (
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={84}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155' }}
                labelStyle={{ color: '#cbd5e1' }}
                itemStyle={{ color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
