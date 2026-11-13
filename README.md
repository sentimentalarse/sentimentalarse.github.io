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

## Editing and publishing

- Edit article fragments in `site/content/`, metadata and page-specific assets in `site/pages.json`, and shared markup in `site/templates/layout.html`.
- Run `npm run build` after editing sources. Commit both sources and generated HTML so existing branch-based GitHub Pages hosting can keep serving the repository root. CI rejects stale generated pages.
- `scripts/build.py` uses only Python's standard library. It also generates `sitemap.xml` and `robots.txt`. Set `BASE_URL` there if the canonical domain changes; the checkout has no custom-domain configuration.
- `js/` contains chart code; `js/charts.js` handles loading/error states and paginated data alternatives. `css/site.css` supplies shared responsive/accessibility fixes over the original theme.
- D3 3.5.17 is pinned locally in `js/vendor/` with its license. Other JavaScript libraries, obsolete analytics, and global math rendering have been removed. Fonts use HTTPS and have system fallbacks.
- `.github/workflows/check.yml` validates pushes and pull requests. This change does not alter repository hosting settings or publish a deployment.

The original Pelican source/configuration was not present. The new source fragments were extracted from its generated pages, retaining article text, dates, datasets, and URLs. Six incomplete prototype URLs now display archive notices and links to published charts; the original experiments remain in Git history. Missing legacy test-post and heatmap URLs have explanatory landing pages.

## Data and analysis

See [dataset documentation](site/content/data/README.html) for sources, snapshot dates, definitions, and limitations. `data/arsenal-results.csv` replaces the extensionless `arsenal_result` file without changing its contents. Radar grouping uses position metadata and excludes goalkeepers from outfield charts; all source records are available in the data table.

`codes/` preserves the original Jupyter notebooks. Their Python dependencies, local input paths, and model execution have not been reconstructed. No newer season data or new model results are included. Preserve these historical snapshots when adding new analyses.

## Further modernization

The legacy D3 major version is retained for compatibility. Migrating its scale/shape/event APIs is a separate change that should preserve the tested chart behavior. Reconstructing the notebook environment requires identifying its original input files and Python package versions.
