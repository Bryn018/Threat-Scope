// Defensive error reporting. Sentry is OPT-IN via VITE_SENTRY_DSN.
// With no DSN configured the module is a quiet no-op (no network calls, no
// fake config) — the app stays fully functional and CI stays green.
//
// To enable on Cloudflare Pages: set the build/env var VITE_SENTRY_DSN to a
// real Sentry DSN. Self-hosted GlitchTip works the same way (point the DSN at
// your instance).

const DSN = import.meta.env?.VITE_SENTRY_DSN

let initialised = false

async function ensureInit() {
  if (initialised || !DSN) return
  initialised = true
  try {
    const Sentry = await import('@sentry/browser')
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env?.MODE || 'production',
      release: import.meta.env?.VITE_APP_VERSION || 'threat-scope',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    })
  } catch (e) {
    // Never let telemetry break the app.
    console.warn('Sentry init skipped:', e)
  }
}

export async function captureException(error, context) {
  if (!DSN) return
  await ensureInit()
  try {
    const Sentry = await import('@sentry/browser')
    Sentry.captureException(error, context ? { extra: context } : undefined)
  } catch {
    /* no-op */
  }
}

export function initErrorReporting() {
  if (!DSN) return
  ensureInit()
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, { phase: 'unhandledrejection' })
  })
  window.addEventListener('error', (event) => {
    captureException(event.error || event.message, { phase: 'window.error' })
  })
}
