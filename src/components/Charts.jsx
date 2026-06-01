import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'

const palette = ['#38bdf8', '#f472b6', '#a78bfa', '#facc15', '#34d399', '#fb7185']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-xs text-slate-100 shadow">
      <p className="mb-1 text-sm font-semibold text-white">{label}</p>
      {payload.map((item, idx) => (
        <p key={idx} className="flex items-center gap-2" style={{ color: item.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name}: <span className="font-semibold text-white">{item.value}</span>
        </p>
      ))}
    </div>
  )
}

function buildVendorRows(vulnerabilities) {
  const counts = vulnerabilities.reduce((acc, v) => {
    const vendor = v.vendorProject || 'Unknown'
    acc.set(vendor, (acc.get(vendor) || 0) + 1)
    return acc
  }, new Map())
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))
}

function severityRows(vulnerabilities) {
  const counts = { Critical: 0, High: 0, Other: 0 }
  for (const v of vulnerabilities) {
    if ((v.knownRansomwareCampaignUse ?? '').toLowerCase() === 'known') counts.Critical += 1
    else if (/immediate|immediately/i.test(v.requiredAction ?? '')) counts.High += 1
    else counts.Other += 1
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

export default function Charts({ vulnerabilities }) {
  const vendor = useMemo(() => buildVendorRows(vulnerabilities), [vulnerabilities])
  const severity = useMemo(() => severityRows(vulnerabilities), [vulnerabilities])

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Top Vendors</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={vendor}>
              <CartesianGrid strokeDasharray="4 4" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {vendor.map((entry, i) => (
                  <Cell key={entry.name} fill={palette[i % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-300">Severity Breakdown</h2>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={severity} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={90} paddingAngle={4}>
                {severity.map((entry, i) => (
                  <Cell key={entry.name} fill={['#f87171', '#fbbf24', '#94a3b8'][i % 3]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
