import json, urllib.request

URL = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json"
print("Fetching MITRE ATT&CK STIX...")
req = urllib.request.Request(URL, headers={"User-Agent": "ThreatScopeBot/1.0"})
with urllib.request.urlopen(req, timeout=120) as r:
    raw = json.load(r)

objs = raw.get("objects", [])
techniques = []
cwe_to_techniques = {}
for o in objs:
    if o.get("type") == "attack-pattern" and not o.get("x_mitre_is_subtechnique") \
       and o.get("revoked") is not True and not o.get("x_mitre_deprecated"):
        ph = [p.get("phase_name") for p in o.get("kill_chain_phases", []) if p.get("kill_chain_name") == "mitre-attack"]
        ref = o.get("external_references", [{}])
        ext_id = ref[0].get("external_id", "") if ref else ""
        weaknesses = o.get("x_mitre_related_weaknesses", [])
        techniques.append({
            "id": ext_id,
            "name": o.get("name", ""),
            "description": (o.get("description") or "")[:600],
            "tactics": ph,
            "url": ref[0].get("url", "") if ref else "",
            "platforms": o.get("x_mitre_platforms", []),
            "detection": (o.get("x_mitre_detection") or "")[:600],
            "weaknesses": weaknesses,
        })
        for cwe in weaknesses:
            tactic = ph[0] if ph else "Other"
            cwe_to_techniques.setdefault(cwe, []).append({"id": ext_id, "name": o.get("name", ""), "tactic": tactic})

assert len(techniques) > 150, "too few techniques"
for p in ("public/data/attack-enterprise.json", "docs/data/attack-enterprise.json"):
    json.dump({"techniques": techniques}, open(p, "w"), separators=(",", ":"))
for p in ("public/data/technique-map.json", "docs/data/technique-map.json"):
    json.dump(cwe_to_techniques, open(p, "w"), separators=(",", ":"))

print("attack-enterprise.json ->", len(techniques), "techniques")
print("technique-map.json ->", len(cwe_to_techniques), "CWEs mapped")
