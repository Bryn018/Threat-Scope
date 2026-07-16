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
import ThemeToggle from './ThemeToggle'

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
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <Shield className="h-7 w-7 text-accent" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-fg">Threat Scope</h1>
            <p className="text-[10px] uppercase tracking-widest text-faint">SOC Dashboard</p>
          </div>
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-faint transition hover:text-fg lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-accent-soft text-accent-ink'
                    : 'text-muted transition hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-faint">Threat Scope v2.0</p>
          <p className="mt-1 text-[10px] text-faint">Insights Security</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar for mobile */}
        <header className="flex items-center gap-3 border-b border-border bg-surface/70 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted transition hover:text-fg"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold text-fg">Threat Scope</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="rounded-md border border-border bg-surface-2 p-1.5 text-muted transition hover:text-fg"
              aria-label="Quick navigation"
              title="Quick navigation"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Desktop command-palette trigger + theme toggle */}
        <header className="hidden items-center justify-end gap-3 border-b border-border bg-surface/70 px-4 py-3 backdrop-blur lg:flex">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted transition hover:border-accent-border hover:text-fg"
          >
            <Search className="h-3.5 w-3.5" />
            Quick nav
            <kbd className="rounded border border-border-strong px-1 text-[10px]">⌘K</kbd>
          </button>
          <ThemeToggle />
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
