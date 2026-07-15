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

function LoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-sm text-slate-400">Loading...</div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<KevDashboard />} />
              <Route path="/cves" element={<CveExplorer />} />
              <Route path="/attack" element={<AttackMatrix />} />
              <Route path="/intel" element={<ThreatIntel />} />
              <Route path="/iocs" element={<IocLookup />} />
              <Route path="/exploits" element={<ExploitTracker />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
