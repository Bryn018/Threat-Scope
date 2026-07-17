import { ExternalLink, X } from 'lucide-react'
import { getRemediationLink } from '../utils/threatUtils'

export default function ThreatModal({ vulnerability, onClose, techniqueMap = {} }) {
  if (!vulnerability) {
    return null
  }

  const remediationLink = getRemediationLink(vulnerability)
  const cwes = Array.isArray(vulnerability.cwes) ? vulnerability.cwes : []
  const techniques = cwes
    .map((cwe) => techniqueMap[cwe])
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-xl border border-border-strong bg-surface-2 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{vulnerability.cveID}</p>
            <h3 className="mt-1 text-lg font-semibold text-fg">{vulnerability.vulnerabilityName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-strong p-1.5 text-muted hover:border-border-strong hover:text-fg"
            aria-label="Close details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 space-y-4 text-sm text-fg">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Vendor / Product</dt>
            <dd className="mt-1">{vulnerability.vendorProject}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Description</dt>
            <dd className="mt-1 text-muted">{vulnerability.shortDescription}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted">Required Action</dt>
            <dd className="mt-1 text-muted">{vulnerability.requiredAction}</dd>
          </div>
          {techniques.length > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">ATT&CK Techniques</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {techniques.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-attack bg-attack-soft px-2 py-1 text-xs text-attack-ink"
                  >
                    <span className="font-mono font-semibold">{t.id}</span>
                    <span className="text-attack-ink">{t.name}</span>
                    <span className="text-attack-ink">({t.tactic})</span>
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <a
          href={remediationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-sky-500/70 bg-accent-soft px-3 py-2 text-sm font-medium text-accent hover:bg-sky-500/20"
        >
          Official Remediation / Patch Link
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
