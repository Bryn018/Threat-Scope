import json

d = json.load(open("public/data/attack-enterprise.json"))
cwe_to_techniques = {}
for t in d["techniques"]:
    for cwe in t.get("weaknesses", []):
        tactic = t["tactics"][0] if t["tactics"] else "Other"
        cwe_to_techniques.setdefault(cwe, []).append({"id": t["id"], "name": t["name"], "tactic": tactic})

for p in ("public/data/technique-map.json", "docs/data/technique-map.json"):
    json.dump(cwe_to_techniques, open(p, "w"), separators=(",", ":"))

print("technique-map.json ->", len(cwe_to_techniques), "CWEs mapped")

e = json.load(open("public/data/exploit-db.json"))
by_cve = {}
for r in e["exploits"]:
    if r.get("cve"):
        by_cve.setdefault(r["cve"], []).append({"id": r["id"], "description": r["description"], "verified": r["verified"]})

for p in ("public/data/exploits-by-cve.json", "docs/data/exploits-by-cve.json"):
    json.dump(by_cve, open(p, "w"), separators=(",", ":"))

print("exploits-by-cve.json ->", len(by_cve), "CVEs with exploits")

kev = json.load(open("public/data/cisa-kev.json"))["vulnerabilities"]
kev_cves = {v["cveID"]: v for v in kev}
with_exploit = sum(1 for c in by_cve if c in kev_cves)
with_tech = 0
for v in kev:
    cwes = set(v.get("cwes", []))
    if cwes & set(cwe_to_techniques):
        with_tech += 1
print("KEVs w/ public exploit:", with_exploit, "| KEVs w/ ATT&CK technique:", with_tech)
