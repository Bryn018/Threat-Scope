#!/usr/bin/env python3
"""Apply the edge security headers from public/_headers to Cloudflare as a
Transform Rule (http_response_headers_transform phase).

Single source of truth: the `/*` block in public/_headers. This keeps the live
edge headers in sync with the repo — infrastructure as code.

Env:
  CLOUDFLARE_API_TOKEN  (required)  scoped: Zone > Transform Rules:Edit, Zone Settings:Read
  CF_ZONE_NAME          (optional)  default: insights.autos
  CF_HOSTNAME           (optional)  default: threatscope.insights.autos
"""
import json
import os
import sys
import urllib.request
import urllib.error

API = "https://api.cloudflare.com/client/v4"
HEADERS_FILE = os.path.join(os.path.dirname(__file__), "..", "public", "_headers")


def cf(token, method, path, body=None):
    # `path` is always a Cloudflare API route we construct ourselves (zone/rule
    # IDs come from Cloudflare's own JSON responses, never from untrusted input).
    # Guard it so no scheme/`..` can ever reach urlopen (which would allow file://).
    if not path.startswith("/") or "://" in path or ".." in path:
        print(f"Refusing unsafe API path: {path!r}", file=sys.stderr)
        sys.exit(1)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected (API base is constant; path validated above)
            return json.load(r)
    except urllib.error.HTTPError as e:
        payload = e.read().decode()
        print(f"HTTP {e.code} on {method} {path}:\n{payload}", file=sys.stderr)
        try:
            return json.loads(payload)
        except ValueError:
            sys.exit(1)


def parse_headers(path):
    """Return the header map from the first `/*` block in _headers."""
    headers, in_block = {}, False
    with open(path) as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if not line.startswith((" ", "\t")):          # a route line
                in_block = line.strip() == "/*"
                continue
            if in_block and ":" in line:                   # an indented header
                key, val = line.strip().split(":", 1)
                # Cache-Control is left to Cloudflare/origin; skip it at the edge rule.
                if key.strip().lower() != "cache-control":
                    headers[key.strip()] = val.strip()
    return headers


def main():
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not token:
        sys.exit("CLOUDFLARE_API_TOKEN not set")
    zone_name = os.environ.get("CF_ZONE_NAME", "insights.autos")
    hostname = os.environ.get("CF_HOSTNAME", "threatscope.insights.autos")

    headers = parse_headers(HEADERS_FILE)
    if not headers:
        sys.exit("No headers parsed from public/_headers")
    print(f"Parsed {len(headers)} headers: {', '.join(headers)}")

    zones = cf(token, "GET", f"/zones?name={zone_name}")
    if not zones.get("success") or not zones.get("result"):
        sys.exit(f"Zone lookup failed for {zone_name}: {zones.get('errors')}")
    zone_id = zones["result"][0]["id"]
    print(f"Zone {zone_name} -> {zone_id}")

    rule = {
        "action": "rewrite",
        "expression": f'(http.host eq "{hostname}")',
        "description": "ThreatScope edge security headers (from public/_headers)",
        "enabled": True,
        "action_parameters": {
            "headers": {k: {"operation": "set", "value": v} for k, v in headers.items()}
        },
    }
    body = {
        "name": "default",
        "description": "ThreatScope security response headers",
        "rules": [rule],
    }
    res = cf(token, "PUT",
             f"/zones/{zone_id}/rulesets/phases/http_response_headers_transform/entrypoint",
             body)
    if not res.get("success"):
        sys.exit(f"Failed to apply ruleset: {res.get('errors')}")
    applied = res["result"]["rules"][0]["action_parameters"]["headers"]
    print(f"Applied Transform Rule for {hostname}: {', '.join(applied)}")


if __name__ == "__main__":
    main()
