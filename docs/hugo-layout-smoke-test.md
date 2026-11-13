# Hugo layout / Markdown smoke test

Status: implementation committed on feature branch; **not yet build-verified or deployed**.

## Layout ownership
- `layouts/_default/baseof.html`: document shell, theme initialization, CSS/JS, sidebar/header/footer.
- `layouts/index.html`: catalog-first homepage and existing v2/v1 fallback.
- `layouts/_default/list.html`: Markdown section listing for posts/news.
- `layouts/_default/single.html`: Markdown article rendering.
- `layouts/partials/site/{sidebar,header,footer}.html`: shared navigation.
- `layouts/partials/head/meta.html`: title, description, canonical, OG/Twitter metadata.
- `static/js/theme-control.js`: theme select and shared mobile drawer interactions.
- `static/js/site.js`: home-only catalog search, category filter, grid/list view.

## Local verification required before merge
1. Install pinned Hugo 0.152.2 and Node 22; `npm ci` if lockfile exists, otherwise `npm install`.
2. Run `npm run build`. Confirm no template errors.
3. Verify generated `public/index.html`, `public/posts/index.html`, `public/news/index.html`.
4. Create **local-only** sample content in `content/posts/example.md` with front matter `title`, `date`, `description` and Japanese Markdown. Run build, verify article page, headings, links, dates and canonical/OG metadata. Do not commit or publish test article.
5. Temporarily move `data/public/catalog.json` and `data/public/videos.json` out of the source tree (if present). Rebuild. Home must show the data-not-ready state while posts/news still work. Restore files.
6. In mobile browser, test menu open/close/backdrop/Escape, focus return; on home test category filtering and card/list preference; on article test theme select and sidebar.
7. Test light/dark/auto with persisted preference, browser refresh, OS theme changes, storage disabled.
8. Check all navigation links, 404 behavior, keyboard navigation, color contrast and 320px viewport.
9. Run Lighthouse mobile and compare JS/CSS gzip sizes against Phase 1 budgets.
10. Review PR and staging before merging to production.

## Known follow-ups
- No real article/news content has been added. Sections intentionally show empty state.
- This change is a minimal structural refactor; Pagefind, thumbnails, analytics, pagination, custom 404 and full OG images are not implemented.
- Full no-catalog build test and browser checks remain pending.
- Confirm Hugo v0.152.2 template lookup and `resources.Get` minification in CI.
