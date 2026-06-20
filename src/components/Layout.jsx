import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Shield,
  Activity,
  Bug,
  Crosshair,
  FileWarning,
  Search,
  Bomb,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'KEV Dashboard' },
  { to: '/cves', icon: Bug, label: 'CVE Explorer' },
  { to: '/attack', icon: Crosshair, label: 'ATT&CK Matrix' },
  { to: '/intel', icon: FileWarning, label: 'Threat Intel' },
  { to: '/iocs', icon: Search, label: 'IOC Lookup' },
  { to: '/exploits', icon: Bomb, label: 'Exploit Tracker' },
  { to: '/resources', icon: BookOpen, label: 'Resources' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-slate-950 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Shield className="h-7 w-7 text-sky-400" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">Threat Scope</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">SOC Dashboard</p>
          </div>
          <button
            className="ml-auto rounded-md p-1 text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">Threat Scope v2.0</p>
          <p className="mt-1 text-[10px] text-slate-600">Sapit P. Brian · Bryn018</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar for mobile */}
        <header className="flex items-center gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur lg:hidden">
          <button
            className="rounded-md p-1.5 text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-400" />
            <span className="text-sm font-semibold text-white">Threat Scope</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
