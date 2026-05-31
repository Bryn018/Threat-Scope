import { ExternalLink, X } from 'lucide-react'
import { getRemediationLink } from '../utils/threatUtils'

export default function ThreatModal({ vulnerability, onClose }) {
  if (!vulnerability) {
    return null
  }

  const remediationLink = getRemediationLink(vulnerability)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">{vulnerability.cveID}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{vulnerability.vulnerabilityName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:border-slate-500 hover:text-white"
            aria-label="Close details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 space-y-4 text-sm text-slate-200">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">Vendor / Product</dt>
            <dd className="mt-1">{vulnerability.vendorProject}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">Description</dt>
            <dd className="mt-1 text-slate-300">{vulnerability.shortDescription}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">Required Action</dt>
            <dd className="mt-1 text-slate-300">{vulnerability.requiredAction}</dd>
          </div>
        </dl>

        <a
          href={remediationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-sky-500/70 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
        >
          Official Remediation / Patch Link
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
