"""Refresh the offline location snapshot from the NIC iGOD district directory."""
import concurrent.futures, html, json, re, urllib.request, http.cookiejar
from datetime import date
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def fetch(url):
    req = urllib.request.Request(url, headers={"X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0", "Referer": "https://igod.gov.in/sg/district/states"})
    with opener.open(req, timeout=30) as r:
        return r.read().decode("utf-8")
def names(page):
    return [html.unescape(re.sub("<[^>]+>", "", v)).strip() for v in re.findall(r'<(?:a|span|div)[^>]+class="search-title"[^>]*>(.*?)</(?:a|span|div)>', page, re.S)]
def get_state(pair):
    url, name = pair
    first = fetch(url)
    total = re.search(r'(\d+)\s+Results', first)
    districts = names(first)[:min(25, int(total[1]))] if total else names(first)
    if total and int(total[1]) > len(districts):
        for start in range(25, int(total[1]), 5):
            more = fetch(url.replace("/organizations", f"/organizations_more/{start}/{min(5, int(total[1])-start)}"))
            districts += names(more)[:min(5, int(total[1])-start)]
    districts = sorted(set(districts))
    if not districts or (total and len(districts) != int(total[1])):
        raise RuntimeError(f"Incomplete directory: {name}: {len(districts)} vs {total[1] if total else '?'}")
    print(name, len(districts), flush=True)
    return html.unescape(name), districts
if __name__ == "__main__":
    source="https://igod.gov.in/sg/district/states"
    pairs = re.findall(r'<a href="(https://igod.gov.in/sg/[A-Z]+/E042/organizations)">([^<]+)</a>', fetch(source))
    assert len(pairs) == 36
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        states = dict(pool.map(get_state, pairs))
    payload={"source":source,"retrieved_on":str(date.today()),"states":states}
    target=ROOT/"apps/backend/src/data/locations.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    frontend=ROOT/"apps/frontend/src/lib/statesDistricts.js"
    frontend.write_text("// NIC iGOD snapshot. Refresh with scripts/refresh_locations.py.\nexport const STATE_DISTRICTS = "+json.dumps(states,ensure_ascii=False,indent=2)+";\nexport const STATES = Object.keys(STATE_DISTRICTS);\nexport function getDistrictsForState(state) { return STATE_DISTRICTS[state] || []; }\n",encoding="utf-8")



