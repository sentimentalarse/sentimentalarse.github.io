"""Check generated output, local resources/anchors, dataset invariants, and JS syntax."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import csv
import json
import math
import subprocess
from build import ROOT, render_pages

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.links, self.ids, self.errors = [], set(), []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.errors.append("Duplicate ID: " + attrs["id"])
            self.ids.add(attrs["id"])
        for key in ("src", "href"):
            if attrs.get(key): self.links.append(attrs[key])
        if tag == "img" and "alt" not in attrs: self.errors.append("Image missing alt")
        if tag in ("script", "link", "img"):
            for key in ("src", "href"):
                if attrs.get(key, "").startswith(("http://", "//")):
                    self.errors.append("Insecure resource: " + attrs[key])

errors = []
outputs = render_pages()
# Working-tree files can pass local tests while being absent from a deployment.
# Include staged additions, so this check also works before the next commit.
tracked = set(subprocess.check_output(
    ["git", "ls-files", "-z"], cwd=ROOT
).decode().split("\0"))
required = set(outputs)
for directory, suffixes in {
    "js": {".js"}, "css": {".css"}, "data": {".csv", ".json"},
    "site": {".html", ".json", ".md", ".markdown"}, "scripts": {".py", ".cjs"},
}.items():
    required.update(path.relative_to(ROOT).as_posix()
                    for path in (ROOT / directory).rglob("*")
                    if path.is_file() and path.suffix in suffixes)
required.update({"package.json", "package-lock.json", ".github/workflows/check.yml",
                 "js/vendor/LICENSE.d3"})
for name in sorted(required - tracked):
    errors.append(f"{name}: not tracked by Git; stage it so it is included in deployment")
docs = {name: Document(source) for name, source in outputs.items() if name.endswith(".html")}
for name, expected in outputs.items():
    path = ROOT / name
    if not path.exists() or path.read_text() != expected:
        errors.append(f"{name}: stale output; run npm run build")
for name, doc in docs.items():
    errors.extend(f"{name}: {error}" for error in doc.errors)
    for link in doc.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        target = unquote(url.path)
        if not target:
            resolved = ROOT / name
        elif target.startswith("/"):
            resolved = ROOT / target.lstrip("/")
        else:
            resolved = (ROOT / name).parent / target
        resolved = resolved.resolve()
        if resolved.is_dir(): resolved /= "index.html"
        if not resolved.exists(): errors.append(f"{name}: missing {link}")
        elif url.fragment and resolved.suffix == ".html":
            other = docs.get(resolved.relative_to(ROOT).as_posix())
            if other and unquote(url.fragment) not in other.ids:
                errors.append(f"{name}: missing anchor {link}")
for path in (ROOT / "js").glob("*.js"):
    result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
    if result.returncode: errors.append(result.stderr)
with (ROOT / "data/arsenal-results.csv").open() as source:
    for row in csv.DictReader(source):
        expected = "1" if row["home_goal"] == row["away_goal"] else ("0" if ((int(row["home_goal"]) > int(row["away_goal"])) == (row["venue"] == "Home")) else "2")
        assert row["ArsenalWin"] == expected, row
with (ROOT / "data/combined.csv").open() as source:
    for row in csv.DictReader(source):
        assert math.isclose(float(row["PPG"]), int(row["Pts"]) / int(row["P"])), row
players = json.loads((ROOT / "data/ars/attr.json").read_text())
assert all(0 <= stat["value"] <= 1 for player in players for stat in player["Stats"])
if errors: raise SystemExit("\n".join(errors))
print(f"Checked {len(docs)} pages: current generated output, local links/anchors, resources, JS syntax, and dataset invariants.")
