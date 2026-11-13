# YuruLink design system — Phase 1 decision record (draft)

Status: **proposal / user review required for visual identity**  
Date: 2026-11-13  
Scope: Hugo frontend, reusable templates, public link catalog and Markdown content. No production deployment authorized.

## 0. Observed baseline (from feat/catalog-v2-taxonomy-ui)

- Hugo `hugo.toml`: Japanese default, `disableKinds = ["taxonomy", "term", "RSS"]`.
- `package.json`: Tailwind CSS 4.1, daisyUI 5; `npm run css:build && hugo --minify`.
- `assets/css/input.css`: CSS custom properties for neutral light/dark palettes, Tailwind `@theme inline`; system-font stack.
- `layouts/index.html`: full document and catalog in a single template, v2 JSON with v1 fallback, static search DOM.
- `static/js/site.js`: theme preference, mobile drawer, category filter and client-side substring search; no external analytics or embeds.
- Frontend Draft PR #4 is not merged. Production and staging must not be changed by this document.
- Project.md states: neutral palette rather than preserving the old burgundy/navy/beige palette; light/dark/auto; sidebar/drawer; Pagefind as search candidate.

## 1. Principles and priorities

1. **Content first:** semantic HTML, readable Japanese typography, useful content with JavaScript disabled wherever practical.
2. **Fast by default:** zero mandatory third-party widgets; static HTML and cached optimized assets; measurable budgets.
3. **Accessible by default:** target WCAG 2.2 AA; visible focus, keyboard navigation, contrast, reduced-motion support.
4. **Reusable by design:** theme and components work without any catalog JSON; ordinary Markdown posts and announcements are first-class.
5. **Trustworthy data:** only approved catalog records; no raw submission notes or private identifiers in frontend bundles.
6. **Progressive enhancement:** search/filter and analytics enhance content, not replace basic navigation.

Priority: P0 required for first usable release, P1 recommended before broad announcement, P2 optional.

## 2. Decision matrix

| Area | Priority | Recommendation / acceptance criterion | Status |
| --- | --- | --- | --- |
| Semantic structure | P0 | One `baseof`, `header`, `main`, `footer`; valid heading hierarchy, landmarks | proposed |
| Content independence | P0 | `hugo --minify` succeeds with absent `data/public/catalog.json`; posts/news and home render | proposed |
| Hugo pages | P0 | Home, catalog, posts list/single, news list/single, 404; meaningful empty states | proposed |
| Design tokens | P0 | CSS variables for semantic colors, typography, spacing, radii, elevation, focus | proposed |
| Themes | P0 | Light/dark/auto, OS change response; no flash where possible; preference persistence optional | baseline exists |
| Typography | P0 | System Japanese font stack; body 16px min, line-height ~1.6–1.8; headings responsive | proposed |
| Contrast | P0 | WCAG AA: text 4.5:1, large text 3:1, UI indicators 3:1 where applicable | proposed |
| Icons | P1 | Inline or sprite SVG with accessible labels; no remote icon font | proposed |
| Images | P0 | Local optimized thumbnails, width/height or aspect-ratio reserved, lazy below fold, fallback | proposed |
| Search | P1 | Pagefind feasibility test for Japanese, multi-thousand item scale; accessible input and URL state | undecided implementation |
| Analytics | P1 | GA4 configurable, off by default, no ID/script when disabled; privacy requirements review | proposed |
| Social | P0 | X plain link, configured via site params; no mandatory embedded feed | proposed |
| External embeds | P2 | Opt-in per component; lazy on interaction; measure performance/privacy | proposed |
| Metadata | P0 | Per-page title/description, canonical, Open Graph and X cards, sitemap, robots | proposed |
| Performance | P0 | Lighthouse CI in PRs, mobile field metrics when traffic allows; asset-size budgets | proposed |
| Visual identity | P0 | Approve accent palette, logo/icon style, card density, tone before visual implementation | **user decision** |
| Reusability boundary | P1 | Extract site-agnostic theme/module only after component APIs stabilize | proposed |

## 3. Performance contract

Field Core Web Vitals targets (75th percentile): LCP <=2.5 s, INP <=200 ms, CLS <=0.1. These are outcome targets, not guarantees.

Provisional engineering budgets, measured on production-like builds:
- Initial JS: <=50 KB gzip, excluding optional analytics/search chunks.
- Site CSS: <=30 KB gzip. Existing Tailwind/daisyUI output must be measured before accepting this budget.
- Thumbnail: <=80 KB target for ordinary cards, adaptive to dimensions/quality; never sacrifice readability blindly.
- Avoid loading all ~3,200 records as thousands of DOM nodes on first paint. Use pagination, static category pages, or search index strategy.
- No default X embedded widget. Third-party GA4 only when configured and compliant.
- Preconnect only to proven critical origins; cache immutable fingerprinted assets.
- Image pipeline must handle SSRF prevention (private networks, DNS rebinding, redirects), timeouts, max bytes/pixels, image licensing and fallback.

CI checks: Hugo build with and without catalog data; HTML/link checks; a11y smoke tests; Lighthouse mobile on representative pages; artifact-size reporting. Test cold cache and throttled mobile, not only desktop local.

## 4. Proposed Hugo architecture

```text
config/_default/{hugo,params,menus,markup}.toml
content/{posts,news}/...md
data/public/catalog.json       # optional
layouts/_default/baseof.html
layouts/_default/{single,list}.html
layouts/{index,404}.html
layouts/partials/{head,header,footer,analytics,social-links}.html
layouts/partials/components/{catalog-card,article-card,search,category-nav}.html
assets/css/{tokens,base,components,input}.css
assets/js/{theme,drawer,catalog-search}.js
assets/images/...
static/icons/...
```

Note: Hugo template lookup naming varies by version; verify `home.html` vs `index.html` and partial conventions against pinned Hugo version before moving files. Keep source `assets` distinct from static published assets. Preserve existing working build until migration tests pass.

Data contract: catalog optional; no template panic when missing; catalog rendering isolated in partial; approved records only; reject unsafe URL schemes. Posts and news are Hugo content, not catalog JSON.

Config example (illustrative):
```toml
[params.analytics]
  enabled = false
  measurementID = ""
[params.social]
  x = ""
[params.features]
  catalog = true
  xEmbed = false
```

GA4 privacy notice/consent, retention, and any jurisdictional requirements must be assessed before enabling.

## 5. UI component inventory

P0: SiteHeader, SiteFooter, MobileDrawer, ThemeSwitcher, SearchField, CategoryNav, CatalogCard, EmptyState, ArticleCard, Breadcrumbs, Pagination, SocialLinks, SkipLink, FocusRing, ImageFallback.

P1: TagChip, FilterChips, SearchResult, Toast/StatusMessage, ShareLink, TableOfContents, DateMetadata.

P2: XPostPreview, RichEmbed, RelatedItems, Collections explorer.

Component contracts should specify semantics, keyboard behavior, focus return, visual states, token dependencies, JS requirement, and screenshot examples at mobile/desktop/light/dark.

## 6. Decisions reserved for the user

A. **Brand visual direction:** neutral editorial / friendly knowledge-library / technical archive. Existing Project.md fixes neutral foundation, not accent color, logo or mood.
B. **Information density:** compact (more results) vs comfortable (larger thumbnails and descriptions) vs responsive hybrid.
C. **Default landing page:** catalog-first vs editorial home featuring posts/announcements + catalog search.
D. **Blog/news content organization:** separate `posts` and `news` sections (recommended) or unified `posts` with types.
E. **OGP sourcing policy:** local cached optimized derivatives (recommended) with source/rights handling; choose fallback style and whether external OGP may be displayed at all.
F. **Privacy policy for GA4:** off by default (recommended), whether consent banner is needed before enablement.
G. **Logo and icon visual language:** typography-led wordmark, geometric link motif, or custom character motif.

Recommended defaults for decisions B–G are intentionally non-binding. Do not change production styling or create public content until reviewed.

## 7. Implementation order after review

1. Baseline measurements and reproducible Hugo build tests; inventory existing CSS/JS bytes.
2. Base template + posts/news + missing-JSON tests, preserving current UI.
3. Semantic tokens + responsive component extraction.
4. Catalog rendering and Japanese Pagefind spike with representative dataset.
5. Thumbnail pipeline and fallbacks.
6. GA4 and social configuration (off by default).
7. Lighthouse CI and a11y regression; staging acceptance.
8. Merge and deploy only after explicit review.

## 8. Reference standards

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Core Web Vitals: https://web.dev/vitals/
- Hugo docs: https://gohugo.io/documentation/
- Pagefind: https://pagefind.app/
- Design tokens specification: https://www.designtokens.org/

This document is a design proposal. It is not evidence that any future feature or performance target has already been implemented.
