import { Link } from 'react-router-dom'
import { Shield, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Shield className="h-16 w-16 text-muted" />
      <h1 className="mt-4 text-4xl font-bold text-fg">404</h1>
      <p className="mt-2 text-sm text-muted">Page not found</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-sky-500/70 bg-accent-soft px-4 py-2 text-sm font-medium text-accent hover:bg-sky-500/20"
      >
        <Home className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
