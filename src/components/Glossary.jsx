import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

const TERMS = [
  {
    term: 'KEV',
    full: 'Known Exploited Vulnerabilities',
    plain: 'A list of security flaws that hackers are actively using to break into systems right now. These are the ones you should fix first.',
  },
  {
    term: 'EPSS',
    full: 'Exploit Prediction Scoring System',
    plain: 'A 0–100% guess at how likely a flaw is to be attacked soon. Higher % = more urgent. (A score of 0.90 = 90% chance.)',
  },
  {
    term: 'CWE',
    full: 'Common Weakness Enumeration',
    plain: 'A category label for the type of mistake in the code (for example “buffer overflow”). Used to group similar flaws.',
  },
  {
    term: 'ATT&CK',
    full: "MITRE ATT&CK",
    plain: 'A map of the tricks and techniques real hacker groups use, so defenders know what to watch for.',
  },
  {
    term: 'Ransomware',
    full: 'Ransomware-linked',
    plain: 'Flaws tied to malware that locks your files and demands payment. These get top priority.',
  },
]

export default function Glossary() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted transition hover:border-accent-border hover:text-fg"
        aria-label="What do these terms mean?"
        title="What do these terms mean?"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        Help
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Glossary of security terms"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Security terms, simply</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-faint transition hover:text-fg"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-muted">
              New to threat intel? Here’s what the words on this dashboard mean in plain language.
            </p>
            <dl className="space-y-3">
              {TERMS.map((t) => (
                <div key={t.term} className="rounded-xl border border-border bg-surface-2 p-3">
                  <dt className="text-sm font-semibold text-accent">
                    {t.term} <span className="font-normal text-faint">· {t.full}</span>
                  </dt>
                  <dd className="mt-1 text-xs text-muted">{t.plain}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
