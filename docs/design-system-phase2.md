# YuruLink Design System — Phase 2 visual direction

Status: proposal; four user choices confirmed on 2026-11-13. Palette, precise dimensions, and logo artwork remain unapproved. This document is not a deployment.

## Confirmed decisions
- Visual mood: friendly knowledge library (親しみやすい知識ライブラリ).
- Density: responsive hybrid; compact desktop browsing and readable mobile cards.
- Homepage: catalog-first, search/category/list prominently featured.
- Logo/icon: geometric symbol; avoid implying affiliation with the referenced shows.
- Prior decision from Project.md: neutral base, light/dark/auto; do not automatically inherit old burgundy/navy/beige branding.

## Palette explorations (illustrative; not approved)
| Candidate | Accent | Background | Text | Character |
| --- | --- | --- | --- | --- |
| A Ink Blue | #355C7D | #F8F9FA | #202B36 | calm editorial |
| B Forest Green | #327A68 | #FAFAF7 | #27332D | friendly discovery (provisional recommendation) |
| C Warm Terracotta | #A35B46 | #FBF9F6 | #342B28 | cultural warmth |

Use semantic CSS variables, not raw color names in components: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-accent`, `--color-accent-contrast`, `--color-focus`, `--color-success`, `--color-danger`. Each candidate needs AA contrast checks and independently designed dark variants. Do not assume the candidate accent is readable on white at all sizes.

## Typography proposal
- Japanese system UI stack first, no required remote font download.
- Base body 16px, line-height 1.7; metadata 13–14px with contrast validation; heading scale ~1.25 modular ratio.
- Responsive headings and line length (body prose ideally ~35–45 Japanese characters per line on wide layouts, with max-width).
- Reserve tabular numerals for counts and dates.
- Typography and spacing tokens implemented with CSS custom properties mapped to Tailwind v4 @theme where appropriate.

## Layout and cards
- Mobile: single column, prominent search, filter drawer; title and short description, reserved thumbnail slot.
- Tablet: 2-column catalog grid; desktop: 3-column or flexible density within content width; keep existing sidebar navigation.
- Two visual card states: thumbnail present, image fallback. Preserve aspect ratio to avoid CLS.
- Card order: category/platform, title, description (clamped), optional published date; whole-card interaction only if keyboard and nested-link semantics remain valid.
- Link catalog remains primary home; posts/news links visible in header/footer without crowding search.

## Icon/brand concept options
1. Two linked geometric loops (directly conveys linking).
2. Connected book spines / stacked cards (knowledge library).
3. Intersecting nodes forming a Y (distinctive, scalable favicon).
Prefer simple 24px grid SVG icons, stroke consistency and visible focus states. Avoid icon-only controls without labels. Logo should work at 16px favicon and monochrome.

## Page skeleton
- Global: skip link, header with wordmark + search, optional theme selector, responsive nav/drawer, main, footer with X and legal/about links.
- Home: search -> featured categories -> catalog grid -> posts/news teaser.
- Catalog: filters, URL-shareable state, result count, pagination or progressive rendering.
- Posts/news: Hugo Markdown sections, list/single, dates, canonical, OG metadata; functional with catalog JSON absent.
- Empty/error states: purposeful instructions and navigation rather than blank grids.

## Motion, responsiveness, accessibility
- Respect prefers-reduced-motion; no gratuitous animated gradients.
- Mobile minimum comfortable touch targets ~44px where practical.
- WCAG 2.2 AA target, focus visible, keyboard drawer escape/return, heading hierarchy, alt text, and language=ja.
- Responsive breakpoints based on content rather than device names; verify at 320px, 375px, 768px, 1280px.

## Performance constraints
- No mandatory external icon font or webfont.
- Pre-generate/cached OGP thumbnails, WebP/AVIF variants when worthwhile, dimensions fixed, loading=lazy below fold; avoid downloading all image assets above the fold.
- Do not render all 3,200 items on initial DOM; test pagination, static grouping, or Pagefind indexing before choosing.
- X profile link in footer; X timeline embed disabled by default.
- GA4 disabled unless explicitly configured and privacy requirements checked.
- Measure actual compiled Tailwind/daisyUI CSS before changing the framework.

## User decisions pending
1. Select or modify palette A/B/C.
2. Pick logo motif (loops / books / geometric Y).
3. Choose catalog card visual emphasis: thumbnail-first or text-first.
4. Confirm home secondary section: posts/news preview below catalog or only navigation link.
No implementation of visual identity or merge/deploy before decisions.

## References
- Phase 1: docs/design-system-phase1.md
- WCAG 2.2 https://www.w3.org/TR/WCAG22/
- Hugo https://gohugo.io/documentation/
- Core Web Vitals https://web.dev/vitals/
