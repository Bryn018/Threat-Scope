import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

const KevDashboard = lazy(() => import('./pages/KevDashboard'))
const CveExplorer = lazy(() => import('./pages/CveExplorer'))
const AttackMatrix = lazy(() => import('./pages/AttackMatrix'))
const ThreatIntel = lazy(() => import('./pages/ThreatIntel'))
const IocLookup = lazy(() => import('./pages/IocLookup'))
const ExploitTracker = lazy(() => import('./pages/ExploitTracker'))
const Resources = lazy(() => import('./pages/Resources'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-slate-400">Loading…</div>
    </div>
  )
}

// Give every lazy route its OWN Suspense + ErrorBoundary. A single top-level
// Suspense wrapping <Routes> is known to intermittently fail to swap lazy
// routes on client-side navigation (the previous route stays mounted);
// per-route boundaries guarantee the view always re-suspends and swaps.
function lazyRoute(El) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <El />
      </Suspense>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={lazyRoute(KevDashboard)} />
          <Route path="/cves" element={lazyRoute(CveExplorer)} />
          <Route path="/attack" element={lazyRoute(AttackMatrix)} />
          <Route path="/intel" element={lazyRoute(ThreatIntel)} />
          <Route path="/iocs" element={lazyRoute(IocLookup)} />
          <Route path="/exploits" element={lazyRoute(ExploitTracker)} />
          <Route path="/resources" element={lazyRoute(Resources)} />
          <Route path="*" element={lazyRoute(NotFound)} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
)
