import json

kev = json.load(open("public/data/cisa-kev.json"))["vulnerabilities"]
epss = json.load(open("public/data/epss-scores.json"))
by_cve = json.load(open("public/data/exploits-by-cve.json"))

# Per-vendor exposure rollup
vendors = {}
for v in kev:
    name = v.get("vendorProject") or "Unknown"
    rec = vendors.setdefault(name, {"kev": 0, "exploit": 0, "ransom": 0, "epss_max": 0.0, "epss_sum": 0.0, "epss_n": 0})
    rec["kev"] += 1
    c = v["cveID"]
    if c in by_cve:
        rec["exploit"] += 1
    if (v.get("knownRansomwareCampaignUse") or "").lower() == "known":
        rec["ransom"] += 1
    s = epss.get(c)
    if s:
        rec["epss_max"] = max(rec["epss_max"], s["epss"])
        rec["epss_sum"] += s["epss"]
        rec["epss_n"] += 1

rows = []
for name, r in vendors.items():
    avg = r["epss_sum"] / r["epss_n"] if r["epss_n"] else 0.0
    rows.append((name, r["kev"], r["exploit"], r["ransom"], round(r["epss_max"], 3), round(avg, 3)))
rows.sort(key=lambda x: (-x[1], -x[3]))
print("Top 12 vendors by KEV count: vendor | KEV | w/exploit | ransomware | maxEPSS | avgEPSS")
for r in rows[:12]:
    print(f"  {r[0]:<14} | {r[1]:>4} | {r[2]:>8} | {r[3]:>9} | {r[4]:>7} | {r[5]:>7}")
print("Total vendors:", len(rows), "| KEVs w/ public exploit:", sum(1 for v in kev if v["cveID"] in by_cve))
