import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { getThreatLevel } from '../utils/threatUtils'

const levelStyles = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-400',
  standard: 'border-l-slate-700',
}

function ThreatBadge({ level }) {
  if (level === 'critical') {
    return <ShieldAlert className="h-4 w-4 text-red-300" aria-label="Critical threat" />
  }

  if (level === 'high') {
    return <AlertTriangle className="h-4 w-4 text-orange-300" aria-label="High threat" />
  }

  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" aria-hidden="true" />
}

export default function ThreatTable({ vulnerabilities, onSelect }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Live Threat Feed</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">CVE ID</th>
              <th className="px-3 py-2">Vendor/Project</th>
              <th className="px-3 py-2">Vulnerability Name</th>
              <th className="px-3 py-2">Date Added</th>
            </tr>
          </thead>
          <tbody>
            {vulnerabilities.map((vulnerability) => {
              const level = getThreatLevel(vulnerability)
              return (
                <tr
                  key={vulnerability.cveID}
                  className={`cursor-pointer border-l-4 border-b border-slate-800 hover:bg-slate-800/60 ${levelStyles[level]}`}
                  onClick={() => onSelect(vulnerability)}
                >
                  <td className="px-3 py-3">
                    <ThreatBadge level={level} />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-100">{vulnerability.cveID}</td>
                  <td className="px-3 py-3">{vulnerability.vendorProject}</td>
                  <td className="px-3 py-3">{vulnerability.vulnerabilityName}</td>
                  <td className="px-3 py-3 text-slate-300">{vulnerability.dateAdded}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
