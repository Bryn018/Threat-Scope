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
  AreaChart,
  Area,
} from 'recharts'

const palette = ['#38bdf8', '#f472b6', '#a78bfa', '#facc15', '#34d399', '#fb7185']

const ChartTooltip = ({ active, payload, label }) => {
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
    .slice(0, 10)
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

function cweRows(vulnerabilities, maxEntries = 8) {
  const counts = new Map()
  for (const v of vulnerabilities) {
    const cwes = Array.isArray(v.cwes) ? v.cwes : []
    for (const cwe of cwes) counts.set(cwe, (counts.get(cwe) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEntries)
    .map(([name, value]) => ({ name, value }))
}

function timelineRows(vulnerabilities) {
  if (!vulnerabilities.length) return []
  const counts = new Map()
  for (const v of vulnerabilities) {
    const date = v.dateAdded?.slice(0, 10)
    if (!date) continue
    const month = date.slice(0, 7)
    counts.set(month, (counts.get(month) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }))
}

export default function Charts({
  vulnerabilities,
  onFilterVendor,
  onFilterCwe,
  onFilterSeverity,
}) {
  const vendorData = useMemo(() => buildVendorRows(vulnerabilities), [vulnerabilities])
  const severityData = useMemo(() => severityRows(vulnerabilities), [vulnerabilities])
  const cweData = useMemo(() => cweRows(vulnerabilities), [vulnerabilities])
  const timelineData = useMemo(() => timelineRows(vulnerabilities), [vulnerabilities])

  const axisStyle = { fontSize: 11, fill: '#94a3b8' }
  const gridStyle = { stroke: '#334155', strokeDasharray: '4 4' }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-300">Top Vendors — click to filter table</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorData}>
                <CartesianGrid {...gridStyle} />
                <XAxis
                  dataKey="name"
                  tick={axisStyle}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={axisStyle} width={45} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  onClick={(entry) => onFilterVendor?.(entry?.name)}
                >
                  {vendorData.map((entry, i) => (
                    <Cell key={entry.name} fill={palette[i % palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-300">Severity Breakdown — click to filter table</h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={90}
                  paddingAngle={4}
                  onClick={(entry) => onFilterSeverity?.(entry?.name)}
                >
                  {severityData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={['#f87171', '#fbbf24', '#94a3b8'][i % 3]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-300">Weakness Categories (CWE) — click to filter table</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cweData}>
                <CartesianGrid {...gridStyle} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={axisStyle} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  onClick={(entry) => onFilterCwe?.(entry?.name)}
                >
                  {cweData.map((entry, i) => (
                    <Cell key={entry.name} fill={palette[i % palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-300">KEVs Added per Month — CISA KEV catalog growth</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="threat-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="date" tick={axisStyle} />
                <YAxis tick={axisStyle} width={35} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#38bdf8"
                  fill="url(#threat-gradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
