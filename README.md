# Threat Scope

A professional, self-hosted **SOC threat-intelligence dashboard** built with React 19, Vite, Tailwind CSS, Recharts, and Lucide. Every panel is backed by **real, authoritative data sources** that are **mirrored and refreshed automatically** — no mock or placeholder data anywhere.

Live site: https://threatscope.insights.autos

## Pages & data sources

| Page | Source | Refresh |
|------|--------|---------|
| **KEV Dashboard** | CISA Known Exploited Vulnerabilities catalog | Hourly (auto) |
| **CVE Explorer** | NIST NVD REST API (live, in-browser) | On demand |
| **ATT&CK Matrix** | MITRE ATT&CK Enterprise STIX | Daily (auto) |
| **Threat Intel** | CISA Advisories + News RSS | Every 3h (auto) |
| **IOC Lookup** | Links to VirusTotal, Shodan, Censys, URLScan, Hybrid Analysis, MalwareBazaar, OTX | On demand |
| **Exploit Tracker** | Exploit-DB (Offensive Security) | Every 6h (auto) |
| **Resources** | Curated directory of security tools & frameworks | Static |

## How "real-time" works

The site is a static GitHub Pages build. Browsers cannot fetch CISA / MITRE / Exploit-DB directly (those endpoints block cross-origin requests). Instead, the [`sync-threat-feeds`](.github/workflows/sync-threat-feeds.yml) GitHub Action pulls each upstream source **server-side** (where CORS does not apply), sanity-checks it, and commits the result into `public/data/` and `docs/data/`. GitHub Pages then redeploys automatically. Every page therefore loads **authentic, current data from the site's own origin** — no API keys, no proxies, no fabricated values.

A second action, [`data-health`](.github/workflows/data-health.yml), fails loudly if any mirrored feed goes missing or stale, so problems are caught within hours.

## Architecture

```
src/                  React app (Vite, HashRouter, lazy-loaded routes)
public/data/*.json    Mirrored feeds (produced by sync-threat-feeds)
docs/                 Built static site served by GitHub Pages
.github/workflows/    sync-threat-feeds · data-health · ci
```

- `KevDashboard` and `CVE Explorer` read CISA / NVD respectively.
- `AttackMatrix`, `ThreatIntel`, and `ExploitTracker` consume the mirrored JSON in `public/data/` so they work without CORS or keys.
- `IOC Lookup` is an honest aggregator: it detects the indicator type and links out to real analysis platforms (it performs no live lookups that require a paid key).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

For the mirrored datasets to exist locally, run the sync (or copy `public/data` from a recent commit):

```bash
# one-off local mirror (requires network)
node scripts/mirror.mjs   # optional helper, or just use the committed data
```

## Quality checks

```bash
npm run lint
npm run test
npm run build      # outputs to dist/ and (for Pages) docs/
```

CI runs lint + build + tests on every push/PR and verifies `docs/` is in sync with `src/`.

## Security

- Content-Security-Policy, `X-Content-Type-Options`, and `Referrer-Policy` headers are set in `index.html`.
- No third-party scripts; all assets are same-origin. Only NVD (NVD API) is contacted cross-origin, and only from the CVE Explorer.
- For disclosure policy and supported versions, see [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
