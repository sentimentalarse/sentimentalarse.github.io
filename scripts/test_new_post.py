"""Test the authoring workflow in isolated copies, without creating real posts."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from build import ROOT, analytics_script, build_site, render_pages
from new_post import create_post


class NewPostTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        shutil.copytree(ROOT / "site", self.root / "site")
        self.post_count = sum(page.get("kind") == "post" for page in json.loads((self.root / "site/pages.json").read_text()))

    def files(self):
        return {p.relative_to(self.root).as_posix(): p.read_bytes()
                for p in self.root.rglob("*") if p.is_file()}

    def test_creates_escaped_post_and_all_listings(self):
        paths = create_post(self.root, 'Arsenal & "Europe"', published="2026-11-13",
                            description='A "quoted" summary', body="<p>Analysis with <strong>data</strong>.</p>")
        name = "arsenal-europe.html"
        metadata = next(page for page in json.loads((self.root / "site/pages.json").read_text()) if page["path"] == name)
        self.assertEqual(metadata["date"], "2026-11-13")
        self.assertEqual(metadata["kind"], "post")
        source = (self.root / "site/content" / name).read_text()
        self.assertIn('Arsenal &amp; &quot;Europe&quot;', source)
        self.assertIn('<strong>data</strong>', source)
        self.assertIn('datetime="2026-11-13"', source)
        for listing in ("index.html", "archives.html", "author/sentimental-arse.html"):
            content = (self.root / listing).read_text()
            self.assertEqual(content.count('href="/' + name + '"'), 1)
            self.assertLess(content.index(name), content.index('visualizing-arsenal-players'))
            self.assertIn(listing, paths)
        self.assertIn(f'({self.post_count + 1})', (self.root / "authors.html").read_text())
        self.assertIn(name, (self.root / "sitemap.xml").read_text())
        for filename, expected in render_pages(self.root).items():
            self.assertEqual((self.root / filename).read_text(), expected)

    def test_backdated_post_is_sorted_and_repeat_build_is_stable(self):
        create_post(self.root, "Earlier analysis", published="2010-01-02")
        listing = (self.root / "index.html").read_text()
        self.assertGreater(listing.index('earlier-analysis.html'), listing.index('heatmap-of-all-the-arsenal'))
        before = self.files()
        with self.assertRaisesRegex(ValueError, "already exists"):
            create_post(self.root, "Earlier analysis", published="2010-01-02")
        self.assertEqual(before, self.files())

    def test_invalid_inputs_do_not_mutate_sources(self):
        for options in ({"slug": "../escape"}, {"slug": "index"}, {"published": "2026-02-30"},
                        {"body": "  "}, {"scripts": ["missing"]}, {"styles": ["../escape"]}):
            with self.subTest(options=options):
                before = self.files()
                with self.assertRaises(ValueError):
                    create_post(self.root, "New article", **options)
                self.assertEqual(before, self.files())

    def test_chart_assets_are_registered_and_included(self):
        for directory, extension in (("js", ".js"), ("css", ".css")):
            (self.root / directory).mkdir()
            (self.root / directory / ("my-chart" + extension)).write_text("/* chart asset */")
        create_post(self.root, "Chart post", slug="custom-url", scripts=["my-chart"], styles=["my-chart"])
        page = (self.root / "custom-url.html").read_text()
        self.assertIn('/js/my-chart.js', page)
        self.assertIn('/css/my-chart.css', page)
        self.assertIn('/js/charts.js', page)
        self.assertIn('/js/vendor/d3-3.5.17.min.js', page)

    def test_cli_imports_body_and_prints_next_steps(self):
        (self.root / "scripts").mkdir()
        for name in ("build.py", "new_post.py", "render-markdown.cjs"):
            shutil.copyfile(ROOT / "scripts" / name, self.root / "scripts" / name)
        body = self.root / "article-body.html"
        body.write_text("<p>My match analysis.</p>")
        result = subprocess.run(
            [sys.executable, str(self.root / "scripts/new_post.py"), "A match review",
             "--date", "2026-11-13", "--body-file", str(body)],
            cwd=self.root, capture_output=True, text=True,
            env=dict(os.environ, NODE_PATH=str(ROOT / "node_modules")))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("My match analysis.", (self.root / "a-match-review.html").read_text())
        self.assertIn("git add", result.stdout)
        self.assertIn("site/content/a-match-review.html", result.stdout)
        self.assertIn("npm test", result.stdout)
        self.assertIn("updated homepage, archive, and author listings", result.stdout)

    def test_markdown_is_retained_and_rebuilt_from_source(self):
        body = ("Opening **analysis** with café.\n\n## What changed?\n\n"
                "- Better shots\n- More possession\n\n"
                "[Source](https://example.com)\n\n![Shots](/images/shots.png)\n\n"
                "| Team | Points |\n| --- | --- |\n| Arsenal | 3 |\n\n"
                "```python\nprint('<goal>')\n```\n\n<div id=\"chart\"></div>\n")
        paths = create_post(self.root, "Match & analysis", published="2026-11-13",
                            body=body, body_format="markdown")
        source = self.root / "site/content/match-analysis.md"
        self.assertEqual(source.read_text(), body)
        self.assertIn("site/content/match-analysis.md", paths)
        self.assertFalse((self.root / "site/content/match-analysis.html").exists())
        page = (self.root / "match-analysis.html").read_text()
        for fragment in ('<strong>analysis</strong>', 'café', '<h2>What changed?</h2>', '<ul>',
                         '<table>', 'class="language-python"', '&lt;goal&gt;',
                         'href="https://example.com"', 'src="/images/shots.png"', '<div id="chart"></div>'):
            self.assertIn(fragment, page)
        self.assertEqual(page.count('<h1 class="article-title">'), 1)
        source.write_text("## Revised findings\n\nA different conclusion.\n")
        build_site(self.root)
        rebuilt = (self.root / "match-analysis.html").read_text()
        self.assertIn('<h2>Revised findings</h2>', rebuilt)
        self.assertNotIn('<strong>analysis</strong>', rebuilt)
        for filename, expected in render_pages(self.root).items():
            self.assertEqual((self.root / filename).read_text(), expected)

    def test_markdown_starter_and_collision_protection(self):
        create_post(self.root, "Markdown starter", body_format="markdown")
        self.assertIn("Write your article here.", (self.root / "site/content/markdown-starter.md").read_text())
        before = self.files()
        with self.assertRaisesRegex(ValueError, "already exists"):
            create_post(self.root, "Markdown starter")
        self.assertEqual(before, self.files())
        (self.root / "site/content/orphan.md").write_text("Keep this draft.")
        with self.assertRaisesRegex(ValueError, "already exists"):
            create_post(self.root, "Orphan")
        self.assertEqual((self.root / "site/content/orphan.md").read_text(), "Keep this draft.")

    def test_cli_detects_markdown_extension_and_copies_source(self):
        (self.root / "scripts").mkdir()
        for name in ("build.py", "new_post.py", "render-markdown.cjs"):
            shutil.copyfile(ROOT / "scripts" / name, self.root / "scripts" / name)
        body = self.root / "original.MD"
        body.write_text("## A Markdown article\n\n**Strong** findings.\n")
        result = subprocess.run(
            [sys.executable, str(self.root / "scripts/new_post.py"), "Markdown import",
             "--body-file", str(body)], cwd=self.root, capture_output=True, text=True,
            env=dict(os.environ, NODE_PATH=str(ROOT / "node_modules")))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("site/content/markdown-import.md", result.stdout)
        self.assertEqual((self.root / "site/content/markdown-import.md").read_text(), body.read_text())
        self.assertIn('<strong>Strong</strong>', (self.root / "markdown-import.html").read_text())
        body.write_text("Original file edited outside the site.")
        build_site(self.root)
        self.assertIn('<strong>Strong</strong>', (self.root / "markdown-import.html").read_text())

    def test_failed_markdown_build_does_not_leave_a_new_post(self):
        (self.root / "site/templates/layout.html").write_text('$undefined_placeholder')
        before = self.files()
        with self.assertRaises(KeyError):
            create_post(self.root, "Markdown failure", body="## Test", body_format="markdown")
        self.assertEqual(before, self.files())

    def test_analytics_configuration_is_included_on_every_page(self):
        config = self.root / "site/analytics.json"
        settings = {"goatcounter_url": "https://test-account.goatcounter.com/", "production_hosts": ["sentimentalarse.github.io"]}
        config.write_text(json.dumps(settings))
        for name, output in render_pages(self.root).items():
            if name.endswith(".html"):
                self.assertEqual(output.count('src="/js/analytics.js"'), 1)
                self.assertIn('data-endpoint="https://test-account.goatcounter.com/count"', output)
        settings["goatcounter_url"] = "http://insecure.example"
        config.write_text(json.dumps(settings))
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            analytics_script(self.root)

    def test_failed_render_restores_manifest_and_removes_new_fragment(self):
        (self.root / "site/templates/layout.html").write_text('$undefined_placeholder')
        before = self.files()
        with self.assertRaises(KeyError):
            create_post(self.root, "New article")
        self.assertEqual(before, self.files())


if __name__ == "__main__":
    unittest.main()
