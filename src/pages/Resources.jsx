import { BookOpen, ExternalLink, Shield, Wrench, Globe, GraduationCap } from 'lucide-react'

const RESOURCE_CATEGORIES = [
  {
    title: 'Vulnerability Databases',
    icon: Shield,
    color: 'text-danger',
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
    color: 'text-accent',
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
    color: 'text-high',
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
    color: 'text-ok',
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
    color: 'text-warning',
    items: [
      { name: 'Krebs on Security', url: 'https://krebsonsecurity.com', desc: 'In-depth security journalism' },
      { name: 'The Hacker News', url: 'https://thehackernews.com', desc: 'Cybersecurity news' },
      { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com', desc: 'Tech security news' },
      { name: 'SANS Internet Storm Center', url: 'https://isc.sans.edu', desc: 'Daily threat diary' },
      { name: 'r/netsec', url: 'https://reddit.com/r/netsec', desc: 'Network security community' },
    ],
  },
]

export default function Resources() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fg">Security Resources</h1>
        <p className="mt-0.5 text-sm text-muted">
          Curated collection of security tools, databases, frameworks, and communities
        </p>
      </div>

      <div className="space-y-6">
        {RESOURCE_CATEGORIES.map((category) => (
          <section key={category.title}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-fg">
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
                  className="group flex items-start justify-between rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition hover:border-border-strong"
                >
                  <div>
                    <p className="text-sm font-medium text-fg group-hover:text-accent">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{item.desc}</p>
                  </div>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-accent" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
