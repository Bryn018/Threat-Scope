import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange }) {
  return (
    <label className="relative block">
      <span className="sr-only">Search vulnerabilities</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by CVE, vendor, or description"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />
    </label>
  )
}
