import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Route components are imported statically (not React.lazy). The app is small
// (~190KB gzip) and a shared vendor chunk already holds React/charts, so eager
// loading is fine and eliminates the react-router v7 + React.lazy route-swap
// freeze (URL changes but the previous view stays mounted on navigation).
import KevDashboard from './pages/KevDashboard'
import CveExplorer from './pages/CveExplorer'
import AttackMatrix from './pages/AttackMatrix'
import ThreatIntel from './pages/ThreatIntel'
import IocLookup from './pages/IocLookup'
import ExploitTracker from './pages/ExploitTracker'
import Exposure from './pages/Exposure'
import Resources from './pages/Resources'
import NotFound from './pages/NotFound'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<KevDashboard />} />
            <Route path="/cves" element={<CveExplorer />} />
            <Route path="/attack" element={<AttackMatrix />} />
            <Route path="/intel" element={<ThreatIntel />} />
            <Route path="/iocs" element={<IocLookup />} />
            <Route path="/exploits" element={<ExploitTracker />} />
            <Route path="/exposure" element={<Exposure />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
