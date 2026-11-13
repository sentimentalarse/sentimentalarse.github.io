"""Create and register an article, then rebuild the static site."""
import argparse
from datetime import date
import json
from pathlib import Path
import re
import shlex
import sys
import unicodedata

from build import ROOT, article_content, build_site


def slugify(title):
    text = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def create_post(root, title, description=None, slug=None, published=None, body=None,
                scripts=(), styles=(), body_format="html"):
    """Validate before writing; return paths the author must stage."""
    if body_format not in ("html", "markdown"):
        raise ValueError("Body format must be html or markdown.")
    title = title.strip()
    if not title or any(ord(char) < 32 for char in title):
        raise ValueError("Use a nonempty title without control characters.")
    slug = slug if slug is not None else slugify(title)
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError("Use --slug with lowercase words separated by hyphens (for example arsenal-season-review).")
    published = date.fromisoformat(published) if published else date.today()
    description = (description or f"{title} — football analysis on Sentimental Arse.").strip()
    if not description:
        raise ValueError("Description cannot be blank.")
    if body is not None and not body.strip():
        raise ValueError("The body file is empty.")
    filename = slug + ".html"
    manifest = root / "site/pages.json"
    pages = json.loads(manifest.read_text())
    source_name = slug + (".md" if body_format == "markdown" else ".html")
    source = root / "site/content" / source_name
    source_exists = any((root / "site/content" / (slug + suffix)).exists()
                        for suffix in (".html", ".md", ".markdown"))
    if any(page["path"].casefold() == filename.casefold() for page in pages) or source_exists or (root / filename).exists():
        raise ValueError(f"{filename} already exists; choose a different --slug. No files were changed.")
    for names, directory, extension in ((scripts, "js", ".js"), (styles, "css", ".css")):
        for name in names:
            if not re.fullmatch(r"[a-zA-Z0-9_-]+", name) or not (root / directory / (name + extension)).is_file():
                raise ValueError(f"Missing or invalid asset: {directory}/{name}{extension}. Create it first; pass the name without its extension.")
    if body is None:
        body = "Write your article here.\n" if body_format == "markdown" else "<p>Write your article here.</p>"
    content = body if body_format == "markdown" else article_content(title, published.isoformat(), body)
    page = {"path": filename, "title": title, "description": description,
            "kind": "post", "date": published.isoformat(),
            "css": list(dict.fromkeys(styles)), "scripts": list(dict.fromkeys(scripts))}
    if body_format == "markdown":
        page["source"] = source_name
    pages.append(page)
    # Preserve original sources if the build rejects any existing page configuration.
    original = manifest.read_bytes()
    try:
        source.write_text(content, encoding="utf-8")
        manifest.write_text(json.dumps(pages, indent=2, ensure_ascii=False) + "\n")
        build_site(root)
    except Exception:
        manifest.write_bytes(original)
        source.unlink(missing_ok=True)
        raise
    paths = [source.relative_to(root).as_posix(), "site/pages.json", filename,
             "index.html", "archives.html", "author/sentimental-arse.html", "authors.html", "sitemap.xml"]
    paths.extend(f"js/{name}.js" for name in scripts)
    paths.extend(f"css/{name}.css" for name in styles)
    return paths


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("title", nargs="?", help="Post title (prompted when omitted in a terminal)")
    parser.add_argument("--slug", help="Optional URL slug; defaults to the title")
    parser.add_argument("--description", help="Short search/social summary")
    parser.add_argument("--date", help="Publication date YYYY-MM-DD (default: today)")
    parser.add_argument("--body-file", type=Path, help="HTML or Markdown (.md/.markdown) body to import")
    parser.add_argument("--markdown", action="store_true", help="Create a Markdown starter, or interpret the body file as Markdown")
    parser.add_argument("--script", action="append", default=[], help="Existing js/ asset name without .js; repeatable")
    parser.add_argument("--style", action="append", default=[], help="Existing css/ asset name without .css; repeatable")
    args = parser.parse_args()
    if args.title is None:
        if not sys.stdin.isatty(): parser.error('Provide a title, for example: npm run post -- "Arsenal season review"')
        args.title = input("Post title: ")
    try:
        body = args.body_file.read_text(encoding="utf-8") if args.body_file else None
        markdown = args.markdown or (args.body_file and args.body_file.suffix.lower() in (".md", ".markdown"))
        paths = create_post(ROOT, args.title, args.description, args.slug, args.date, body, args.script, args.style,
                            body_format="markdown" if markdown else "html")
    except (ValueError, OSError) as error:
        parser.exit(1, f"Cannot create post: {error}\n")
    print(f"Created {paths[0]}\nBuilt /{paths[2]} and updated homepage, archive, and author listings.")
    print(f"\nEdit {paths[0]}, then run npm run build. Preview with npm run dev.")
    print("\nStage the post and generated files before testing:\n  git add " + " ".join(shlex.quote(path) for path in paths))
    print("  npm test\n\nCommit and push when the post is ready. Include any new images or datasets too.")


if __name__ == "__main__":
    main()
