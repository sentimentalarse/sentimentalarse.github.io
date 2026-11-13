"""Render the preserved article fragments through one shared layout; no dependencies."""
from pathlib import Path
from string import Template
from urllib.parse import quote
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://sentimentalarse.github.io"

def render_pages():
    layout = Template((ROOT / "site/templates/layout.html").read_text())
    pages = json.loads((ROOT / "site/pages.json").read_text())
    output = {}
    for page in pages:
        url = BASE_URL + "/" + quote(page["path"], safe="/")
        scripts = ""
        if page["scripts"]:
            scripts = '<noscript><p>Interactive charts require JavaScript. <a href="/data/README.html">Download the source datasets</a>.</p></noscript>\n<script src="/js/vendor/d3-3.5.17.min.js"></script>\n<script src="/js/charts.js"></script>\n'
            scripts += "\n".join(f'<script src="/js/{name}.js"></script>' for name in page["scripts"])
        output[page["path"]] = layout.substitute(
            title=escape(page["title"]), description=escape(page["description"], quote=True),
            canonical=escape(url, quote=True), content=(ROOT / "site/content" / page["path"]).read_text(),
            styles="\n".join(f'<link rel="stylesheet" href="/css/{name}.css">' for name in page["css"]),
            scripts=scripts)
    urls = "".join(f"<url><loc>{escape(BASE_URL + '/' + quote(p['path'], safe='/'))}</loc></url>" for p in pages)
    output["sitemap.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>\n'
    output["robots.txt"] = f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n"
    return output

if __name__ == "__main__":
    for name, content in render_pages().items():
        path = ROOT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    print("Rendered site HTML, sitemap, and robots.txt.")
