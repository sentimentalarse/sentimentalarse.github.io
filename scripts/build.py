"""Render HTML and Markdown articles through one shared layout."""
from pathlib import Path
from string import Template
from urllib.parse import quote, urlsplit
from html import escape
import json
import re
import subprocess
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://sentimentalarse.github.io"

def article_content(title, published, body):
    """Wrap a post body with its shared heading and metadata."""
    published = date.fromisoformat(published)
    return (f'<h1 class="article-title">{escape(title)}</h1>\n'
            f'<p class="article-date"><time datetime="{published.isoformat()}">{published.strftime("%B")} {published.day}, {published.year}</time></p>\n'
            f'<div class="article-content">\n{body.rstrip()}\n</div>\n'
            '<p><a href="/">← Back to Home</a></p>\n')


def render_markdown(body):
    renderer = Path(__file__).with_name("render-markdown.cjs")
    try:
        result = subprocess.run(["node", str(renderer)], input=body, text=True,
                                capture_output=True, check=False)
    except FileNotFoundError as error:
        raise ValueError("Markdown builds require Node.js and npm ci --ignore-scripts.") from error
    if result.returncode:
        raise ValueError("Markdown conversion failed. Run npm ci --ignore-scripts to install the renderer.\n" + result.stderr.strip())
    return result.stdout


def page_content(root, page):
    directory = (root / "site/content").resolve()
    source = (directory / page.get("source", page["path"])).resolve()
    if not source.is_relative_to(directory):
        raise ValueError("Article sources must be inside site/content.")
    body = source.read_text(encoding="utf-8")
    if source.suffix.lower() in (".md", ".markdown"):
        if page.get("kind") != "post":
            raise ValueError("Markdown sources require post metadata (kind, title, and date).")
        return article_content(page["title"], page["date"], render_markdown(body))
    return body


def analytics_script(root):
    settings = json.loads((root / "site/analytics.json").read_text())
    site_url = settings.get("goatcounter_url", "").strip()
    endpoint = ""
    if site_url:
        url = urlsplit(site_url)
        if (url.scheme != "https" or not url.hostname or url.username or url.password
                or url.port or url.query or url.fragment or url.path not in ("", "/", "/count")):
            raise ValueError("goatcounter_url must be an HTTPS GoatCounter site URL or /count endpoint.")
        endpoint = f"https://{url.hostname}/count"
    hosts = settings.get("production_hosts", [])
    if (not isinstance(hosts, list) or not hosts
            or any(not isinstance(host, str) or not re.fullmatch(r"[a-z0-9]+(?:[.-][a-z0-9]+)*", host) for host in hosts)):
        raise ValueError("production_hosts must contain lowercase hostnames without protocols or paths.")
    return ('<script defer src="/js/analytics.js" '
            f'data-endpoint="{escape(endpoint, quote=True)}" '
            f'data-production-hosts="{escape(",".join(hosts), quote=True)}"></script>')


def render_pages(root=ROOT):
    layout = Template((root / "site/templates/layout.html").read_text())
    pages = json.loads((root / "site/pages.json").read_text())
    posts = sorted((page for page in pages if page.get("kind") == "post"),
                   key=lambda page: (date.fromisoformat(page["date"]), page["path"]), reverse=True)
    post_list, archive_list = [], []
    for post in posts:
        published = date.fromisoformat(post["date"])
        link = f'<a href="/{escape(quote(post["path"], safe="/"), quote=True)}">{escape(post["title"])}</a>'
        post_list.append(f'<h2 class="article-title pull-left">{link}</h2>\n'
                         f'<p class="article-date pull-right"><time datetime="{published.isoformat()}">{published.strftime("%b")} {published.day}, {published.year}</time></p>\n<hr class="large">')
        archive_list.append(f'<dt><time datetime="{published.isoformat()}">{published.strftime("%a %d %B %Y")}</time></dt>\n<dd>{link}</dd>')
    replacements = {"{{post_list}}": "\n".join(post_list), "{{archive_list}}": "\n".join(archive_list),
                    "{{post_count}}": str(len(posts))}
    analytics = analytics_script(root)
    output = {}
    for page in pages:
        url = BASE_URL + "/" + quote(page["path"], safe="/")
        scripts = ""
        if page["scripts"]:
            scripts = '<noscript><p>Interactive charts require JavaScript. <a href="/data/README.html">Download the source datasets</a>.</p></noscript>\n<script src="/js/vendor/d3-3.5.17.min.js"></script>\n<script src="/js/charts.js"></script>\n'
            scripts += "\n".join(f'<script src="/js/{name}.js"></script>' for name in page["scripts"])
        content = page_content(root, page)
        for marker, replacement in replacements.items():
            content = content.replace(marker, replacement)
        output[page["path"]] = layout.substitute(
            title=escape(page["title"]), description=escape(page["description"], quote=True),
            canonical=escape(url, quote=True), content=content,
            styles="\n".join(f'<link rel="stylesheet" href="/css/{name}.css">' for name in page["css"]),
            scripts=scripts, analytics=analytics)
    urls = "".join(f"<url><loc>{escape(BASE_URL + '/' + quote(p['path'], safe='/'))}</loc></url>" for p in pages)
    output["sitemap.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + '</urlset>\n'
    output["robots.txt"] = f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n"
    return output

def build_site(root=ROOT):
    for name, content in render_pages(root).items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)


if __name__ == "__main__":
    build_site()
    print("Rendered site HTML, sitemap, and robots.txt.")
