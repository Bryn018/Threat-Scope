# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

Threat Scope is a continuously-deployed static dashboard; only the latest `main`
branch (and the live site it builds) receives security updates.

## Reporting a Vulnerability

If you discover a security issue in Threat Scope, **please do not open a public
GitHub issue.** Instead, report it privately:

- Email the maintainer (see the GitHub repo "About" for the contact) with:
  - A description of the issue and its impact
  - Steps to reproduce (or a proof-of-concept)
  - Any suggested remediation

You can expect an acknowledgement within **3 business days**. Once validated,
we aim to ship a fix within **7–14 days** depending on severity, and we will
credit you (with your permission) in the release notes.

## Scope & Architecture Notes

Threat Scope is a **read-only client-side dashboard** that visualizes data from
public threat-intelligence sources. Relevant security properties:

- **No backend, no stored secrets.** The site is a static GitHub Pages build.
  Feed data is mirrored by GitHub Actions from public sources; no API keys are
  required or stored in the repository.
- **Content Security Policy** is enforced (see `index.html`): scripts/styles are
  same-origin only, `frame-ancestors` is `none`, and `object-src` is disabled.
- **Cross-origin requests** are limited to the NIST NVD API from the CVE Explorer
  page. All other feeds are served from the site's own origin.
- **IOC Lookup** only generates links to external analysis platforms; it never
  submits indicators to a third party on your behalf.

### Out of scope

- The upstream threat-intel sources themselves (CISA, MITRE, NVD, Exploit-DB).
- The hosting provider (GitHub Pages) infrastructure.
- Any local machine running `npm run dev`.

## Hardening Checklist (for deployers)

- Keep the custom domain's DNS and TLS managed by GitHub Pages (do not downgrade to HTTP).
- Enable branch protection on `main` so the auto-sync commits cannot be force-pushed over.
- Review the `sync-threat-feeds` and `data-health` workflows periodically; they hold
  `contents: write` scoped to this repo only.
