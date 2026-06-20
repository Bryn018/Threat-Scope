import { BookOpen, ExternalLink, Shield, Wrench, Globe, GraduationCap, Briefcase } from 'lucide-react'

const RESOURCE_CATEGORIES = [
  {
    title: 'Vulnerability Databases',
    icon: Shield,
    color: 'text-red-400',
    items: [
      { name: 'NVD — National Vulnerability Database', url: 'https://nvd.nist.gov', desc: 'Official US government vulnerability database' },
      { name: 'CISA KEV Catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', desc: 'Known exploited vulnerabilities' },
      { name: 'VulDB', url: 'https://vuldb.com', desc: 'Commercial vulnerability intelligence' },
      { name: 'OSV — Open Source Vulnerabilities', url: 'https://osv.dev', desc: 'Open source vulnerability database' },
    ],
  },
  {
    title: 'Threat Intelligence Platforms',
    icon: Globe,
    color: 'text-sky-400',
    items: [
      { name: 'VirusTotal', url: 'https://www.virustotal.com', desc: 'File and URL analysis' },
      { name: 'Shodan', url: 'https://www.shodan.io', desc: 'Internet-connected device search' },
      { name: 'Censys', url: 'https://search.censys.io', desc: 'Internet asset discovery' },
      { name: 'OTX AlienVault', url: 'https://otx.alienvault.com', desc: 'Open threat intelligence community' },
      { name: 'URLScan.io', url: 'https://urlscan.io', desc: 'Website scanning and analysis' },
      { name: 'AbuseIPDB', url: 'https://www.abuseipdb.com', desc: 'IP reputation database' },
    ],
  },
  {
    title: 'Exploit & Malware Research',
    icon: Wrench,
    color: 'text-orange-400',
    items: [
      { name: 'Exploit-DB', url: 'https://www.exploit-db.com', desc: 'Public exploit archive' },
      { name: 'MalwareBazaar', url: 'https://bazaar.abuse.ch', desc: 'Malware sample sharing' },
      { name: 'Hybrid Analysis', url: 'https://www.hybrid-analysis.com', desc: 'Malware sandbox analysis' },
      { name: 'ANY.RUN', url: 'https://any.run', desc: 'Interactive malware sandbox' },
    ],
  },
  {
    title: 'MITRE ATT&CK & Frameworks',
    icon: GraduationCap,
    color: 'text-violet-400',
    items: [
      { name: 'MITRE ATT&CK', url: 'https://attack.mitre.org', desc: 'Adversary tactics and techniques' },
      { name: 'MITRE D3FEND', url: 'https://d3fend.mitre.org', desc: 'Defensive countermeasures' },
      { name: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework', desc: 'CSF 2.0 framework' },
      { name: 'CIS Controls', url: 'https://www.cisecurity.org/controls', desc: 'Top 18 security controls' },
      { name: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', desc: 'Web application security risks' },
    ],
  },
  {
    title: 'Security Tools',
    icon: Wrench,
    color: 'text-emerald-400',
    items: [
      { name: 'Nmap', url: 'https://nmap.org', desc: 'Network scanner' },
      { name: 'Burp Suite', url: 'https://portswigger.net/burp', desc: 'Web app security testing' },
      { name: 'Metasploit', url: 'https://www.metasploit.com', desc: 'Penetration testing framework' },
      { name: 'Wireshark', url: 'https://www.wireshark.org', desc: 'Network protocol analyzer' },
      { name: 'YARA', url: 'https://virustotal.github.io/yara/', desc: 'Pattern matching for malware' },
      { name: 'Volatility', url: 'https://www.volatilityfoundation.org', desc: 'Memory forensics framework' },
    ],
  },
  {
    title: 'Security News & Communities',
    icon: BookOpen,
    color: 'text-amber-400',
    items: [
      { name: 'Krebs on Security', url: 'https://krebsonsecurity.com', desc: 'In-depth security journalism' },
      { name: 'The Hacker News', url: 'https://thehackernews.com', desc: 'Cybersecurity news' },
      { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com', desc: 'Tech security news' },
      { name: 'SANS Internet Storm Center', url: 'https://isc.sans.edu', desc: 'Daily threat diary' },
      { name: 'r/netsec', url: 'https://reddit.com/r/netsec', desc: 'Network security community' },
    ],
  },
]

const PROJECTS = [
  {
    name: 'Threat Scope',
    desc: 'SOC-style dashboard for CISA KEV vulnerabilities with real-time filtering, charts, and ATT&CK mapping.',
    url: 'https://threatscope.insights.autos',
    tags: ['React', 'CISA KEV', 'ATT&CK'],
  },
  {
    name: 'Spotics',
    desc: 'Client-side Last.fm listening analytics dashboard. Zero server, no Spotify Developer account needed.',
    url: 'https://spotics.insights.autos',
    tags: ['Last.fm', 'Analytics', 'Client-side'],
  },
  {
    name: 'GuardY',
    desc: 'Defensive telemetry pipeline with structured JSONL logging for security monitoring.',
    url: 'https://github.com/Bryn018/GuardY',
    tags: ['Python', 'Telemetry', 'Logging'],
  },
  {
    name: 'Sparky',
    desc: 'CLI tool for checking secure routing protocol statuses (RPKI/BGP) via the RIPEstat API.',
    url: 'https://github.com/Bryn018/Sparky',
    tags: ['CLI', 'BGP', 'RPKI'],
  },
  {
    name: 'Net Anomaly Detector',
    desc: 'ML-powered network anomaly detection using Scapy and IsolationForest with live capture.',
    url: 'https://github.com/Bryn018/Net-Anomaly-Detector',
    tags: ['Python', 'Scapy', 'ML'],
  },
  {
    name: 'TOTP Auth',
    desc: 'Security-first Node.js starter for email/password auth with TOTP 2FA and lockout protection.',
    url: 'https://github.com/Bryn018/totp-auth-starter',
    tags: ['Node.js', 'TOTP', 'Auth'],
  },
]

export default function Resources() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Security Resources</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Curated collection of security tools, databases, frameworks, and my projects
        </p>
      </div>

      {/* Projects showcase */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Briefcase className="h-5 w-5 text-sky-400" />
          Featured Projects
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((project) => (
            <a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-500/40"
            >
              <h3 className="text-sm font-semibold text-white group-hover:text-sky-300">{project.name}</h3>
              <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{project.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Resource categories */}
      <div className="space-y-6">
        {RESOURCE_CATEGORIES.map((category) => (
          <section key={category.title}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <category.icon className={`h-5 w-5 ${category.color}`} />
              {category.title}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {category.items.map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 transition hover:border-slate-700"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-sky-300">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 group-hover:text-sky-400" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center">
        <p className="text-xs text-slate-500">
          Threat Scope v2.0 — Built by Sapit P. Brian (Bryn018) · Cybersecurity Engineer
        </p>
        <p className="mt-1 text-xs text-slate-600">
          8+ Cisco Certifications · AttackIQ · MITRE ATT&CK v13
        </p>
      </div>
    </div>
  )
}
