import { Search } from 'lucide-react'

export default function Filters({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search vulnerabilities"
          className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-9 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
        />
      </div>
    </div>
  )
}
