# Sentimental Arse

A static archive of Arsenal and football analytics articles originally published in 2015, with D3 visualizations and historical datasets. Existing article URLs are preserved. No backend or runtime package installation is needed to serve the site.

## Preview and checks

Requires Python 3.10+ and Node.js 20+ (Node 22 is used in CI).

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run dev
```

Open http://127.0.0.1:8000. Serve over HTTP; opening HTML via `file://` prevents chart data loading.

`npm test` checks reproducible output, local resources and links, duplicate IDs, JavaScript syntax, dataset invariants, and DOM integration of all four published chart types. Integration checks include request failures, data-table pagination, keyboard rank filtering, country flag counts, and player grouping. SVG text measurement is approximated in DOM tests; mobile layout, visual appearance, and actual screen-reader behavior still need browser review.

## Add a post

```sh
npm run post -- "Arsenal season review" --description "What the season's numbers tell us."
```

This creates `site/content/arsenal-season-review.html` with a starter paragraph, registers its metadata, and rebuilds the site. Edit the fragment, run `npm run build`, and preview with `npm run dev`. Homepage, archive, author listings, and sitemap update automatically. The tool prints the exact files to stage before running `npm test`; it does not stage, commit, or publish anything.

To import a body you have already written, pass an HTML fragment (without `<html>`, `<head>`, or the article heading):

```sh
npm run post -- "Arsenal season review" --slug season-review --date 2026-11-13 --description "An analysis of Arsenal's season." --body-file /path/to/article.html
```

Options:

- `--slug`: custom URL name; generated from the title by default. Existing pages are never overwritten.
- `--date`: `YYYY-MM-DD`, defaulting to today. Posts are listed newest first. Future dates are displayed immediately; this is not a publication scheduler.
- `--description`: summary for search and social previews; defaults to the title plus a short site description.
- `--body-file`: HTML fragment or Markdown file (`.md` or `.markdown`, case-insensitive). Markdown is copied into `site/content/` and rebuilt from that copy.
- `--markdown`: create a Markdown starter instead of HTML, or treat a body file with another extension as Markdown.
- `--script my-chart` and `--style my-chart`: attach existing `js/my-chart.js` and `css/my-chart.css` files. Repeat for multiple assets. Scripts automatically include D3 and the shared loader. Add the chart container to your article body and stage new assets and datasets too.

Run `npm run post -- --help` for help, or `npm run post` to enter a title interactively. For Markdown posts, edit the title and date in `site/pages.json` and rebuild; the heading and date are generated automatically. For HTML posts, also update the visible heading/date in the content fragment.

### Write in Markdown

Install build dependencies with `npm ci --ignore-scripts`, then import an existing article:

```sh
npm run post -- "Arsenal match analysis" --body-file article.md
```

Or start a new Markdown article:

```sh
npm run post -- "Arsenal match analysis" --markdown
```

The tool creates `site/content/arsenal-match-analysis.md`, records it as the post's source in `site/pages.json`, and generates `arsenal-match-analysis.html`. Edit the retained `.md` file, then run `npm run build` to refresh the published HTML. The original imported file is not reread. Commit the Markdown source, manifest, generated pages, and any new assets; the tool prints a staging command.

Write only the article body; the title and publication date come from the post metadata. Use `##` for sections and `###` for subsections:

````markdown
Arsenal created **better chances** after halftime.

## What changed?

- More possession in the final third
- Better shot selection

| Team | Points |
| --- | --- |
| Arsenal | 3 |

[Source data](/data/combined.csv)

![Shot locations](/images/shot-map.png)

```python
points_per_game = points / matches
```

<div id="chart"></div>
````

Headings, emphasis, lists, links, images, tables, blockquotes, and fenced code blocks are supported. Code is escaped and gets language classes; syntax highlighting is not added automatically. Raw HTML is preserved so you can include chart containers. Include image/data references only when the files exist, and use root-relative asset URLs such as `/images/shot-map.png`. A chart container needs JavaScript attached with `--script`; it does not draw a chart by itself.

There is no YAML front matter: use the posting command's options or edit `site/pages.json` for the title, date, description, scripts, and styles.

### Import HTML or plain text

Existing HTML posts continue to work:

```sh
npm run post -- "Arsenal match analysis" --body-file article.html
```

`article.html` should contain only the body fragment, without `<html>`, `<head>`, or a duplicate article title. It is copied into a complete fragment at `site/content/arsenal-match-analysis.html`. Edit that content fragment for later changes and run `npm run build`.

For plain text, `--markdown --body-file article.txt` treats blank-line-separated paragraphs as Markdown. Alternatively, wrap paragraphs in `<p>...</p>` to prepare an HTML body, escaping literal `&` and `<` as `&amp;` and `&lt;`.

## Editing and publishing

- Edit article Markdown sources or HTML fragments in `site/content/`, metadata and page-specific assets in `site/pages.json`, and shared markup in `site/templates/layout.html`.
- Run `npm run build` after editing sources. Commit both sources and generated HTML so existing branch-based GitHub Pages hosting can keep serving the repository root. CI rejects stale generated pages.
- `scripts/build.py` uses Python plus the pinned Node.js `markdown-it` dependency for Markdown posts. Run `npm ci --ignore-scripts` before building Markdown. It also generates `sitemap.xml` and `robots.txt`. Set `BASE_URL` there if the canonical domain changes; the checkout has no custom-domain configuration.
- `js/` contains chart code; `js/charts.js` handles loading/error states and paginated data alternatives. `css/site.css` supplies shared responsive/accessibility fixes over the original theme.
- D3 3.5.17 is pinned locally in `js/vendor/` with its license. Other JavaScript libraries, obsolete analytics, and global math rendering have been removed. Fonts use HTTPS and have system fallbacks.
- `.github/workflows/check.yml` validates pushes and pull requests. This change does not alter repository hosting settings or publish a deployment.

The original Pelican source/configuration was not present. The new source fragments were extracted from its generated pages, retaining article text, dates, datasets, and URLs. Six incomplete prototype URLs now display archive notices and links to published charts; the original experiments remain in Git history. Missing legacy test-post and heatmap URLs have explanatory landing pages.

## Page analytics (GoatCounter)

Every page includes a shared GoatCounter loader. Configure your account in `site/analytics.json`:

```json
{
  "goatcounter_url": "https://YOUR-SITE.goatcounter.com",
  "production_hosts": ["sentimentalarse.github.io"]
}
```

Create a hosted account at https://www.goatcounter.com/signup and use the site URL it assigns. This public URL is not a secret or API key. The loader uses GoatCounter's official HTTPS script and `/count` endpoint. Setup reference: https://www.goatcounter.com/help/start.

This site is configured for `https://sentimentalarse.goatcounter.com/`. Add your custom domain to `production_hosts` if you use one. Only HTTPS pages on these exact hosts load the tracker; localhost, file previews, and other preview domains do not load it. No chart-interaction tracking is configured.

After changing the settings, run `npm run build`, commit the config and regenerated HTML, and deploy. Open a live article and check its pageview in your GoatCounter dashboard. Ad blockers can prevent collection. To disable tracking, clear `goatcounter_url`, rebuild, and deploy again.

## Data and analysis

See [dataset documentation](site/content/data/README.html) for sources, snapshot dates, definitions, and limitations. `data/arsenal-results.csv` replaces the extensionless `arsenal_result` file without changing its contents. Radar grouping uses position metadata and excludes goalkeepers from outfield charts; all source records are available in the data table.

`codes/` preserves the original Jupyter notebooks. Their Python dependencies, local input paths, and model execution have not been reconstructed. No newer season data or new model results are included. Preserve these historical snapshots when adding new analyses.

## Further modernization

The legacy D3 major version is retained for compatibility. Migrating its scale/shape/event APIs is a separate change that should preserve the tested chart behavior. Reconstructing the notebook environment requires identifying its original input files and Python package versions.
