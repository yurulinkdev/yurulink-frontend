# Cloudflare Pages environments — operational design

Status: **target architecture**; staging project has not been created by this repository change.

| Role | Cloudflare Pages project | Git branch | Purpose |
|---|---|---|---|
| Production | `yurulink-frontend` (existing) | `main` | Public catalog; currently not officially launched |
| Staging | `yurulink-frontend-staging` (proposed name) | `staging` | Persistent, production-like QA |
| PR previews | Cloudflare branch preview deployments | feature branches | Short-lived change review |

Both Pages projects must use the **same** Node/Hugo versions, build command, repository root, CSS build and output folder (`public`). Recommended build command: `npm ci && npm run css:build && hugo --minify` once a committed lockfile exists; until then use `npm install && npm run css:build && hugo --minify`.

Staging should use a separate Pages hostname and optionally Cloudflare Access to restrict access. No production custom domain or DNS changes are needed. No secrets in frontend artifacts.

## Data promotion

- Production and staging may consume **the same sanitized public dataset snapshot** initially, so UI differences are testable. Once backend supports it, stage new data snapshots in staging first, then promote the identical validated artifact to production.
- Production: merge approved changes to `main`.
- Staging: merge/rebase selected changes to `staging`, build and smoke-test first.
- PR previews: for every feature branch if Pages Git integration supports it.
- Avoid manual edits in staging that cannot be reproduced in production. Track environment-specific settings in the Pages dashboard and documentation.
- Rollback: Cloudflare Pages deployment rollback and/or Git revert. Never overwrite the legacy Blue site during migration.

## Acceptance criteria

Both environments must pass: CSS/JS 200 status, mobile drawer interaction, light/dark/auto persistence, no client errors, valid JSON data counts, no unpublished records, and representative Japanese search tests.
