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
  Radar,
  Users,
  Share2,
  Bell,
} from 'lucide-react'
import CommandPalette from './CommandPalette'

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'KEV Dashboard' },
  { to: '/cves', icon: Bug, label: 'CVE Explorer' },
  { to: '/attack', icon: Crosshair, label: 'ATT&CK Matrix' },
  { to: '/intel', icon: FileWarning, label: 'Threat Intel' },
  { to: '/iocs', icon: Search, label: 'IOC Lookup' },
  { to: '/exploits', icon: Bomb, label: 'Exploit Tracker' },
  { to: '/exposure', icon: Radar, label: 'Tech Exposure' },
  { to: '/actors', icon: Users, label: 'Threat Actors' },
  { to: '/graph', icon: Share2, label: 'Attack Graph' },
  { to: '/watchlist', icon: Bell, label: 'Watchlist' },
  { to: '/resources', icon: BookOpen, label: 'Resources' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

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
            <p className="text-[10px] uppercase tracking-widest text-slate-400">SOC Dashboard</p>
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
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Threat Scope v2.0</p>
          <p className="mt-1 text-[10px] text-slate-400">Waly · Bryn018</p>
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
          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto rounded-md border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 hover:text-white"
            aria-label="Quick nav"
          >
            <Search className="h-4 w-4" />
          </button>
        </header>

        {/* Desktop command-palette trigger */}
        <header className="hidden items-center justify-end gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur lg:flex">
          <button
            onClick={() => setPaletteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:border-white/30 hover:text-slate-200"
          >
            <Search className="h-3.5 w-3.5" />
            Quick nav
            <kbd className="rounded border border-slate-700 px-1 text-[10px]">⌘K</kbd>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </div>
  )
}
