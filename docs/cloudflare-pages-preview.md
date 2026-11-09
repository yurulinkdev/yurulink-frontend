# Cloudflare Pages preview deployment

This project is an independent **Green frontend preview**. Do not attach the existing production domain or replace the Blue site.

## Create the project

1. Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git.
2. Authorize GitHub repository `yurulinkdev/yurulink-frontend`.
3. Set the project name to an available name, e.g. `yurulink-preview`. The resulting hostname is assigned by Cloudflare; do not assume it exists before deployment.
4. Set production branch to `main` (this is a new Pages project only; **not** the existing YuruLink domain).
5. Set build command to `npm run build -- --baseURL "$CF_PAGES_URL"` **only if** the npm script passes flags to Hugo. The current npm script does not, so use the explicit command below instead.
6. **Build command:** `npm run css:build && hugo --minify --baseURL "$CF_PAGES_URL"`
7. **Build output directory:** `public`; root directory: repository root.
8. Environment variables for both Production and Preview:
   - `HUGO_VERSION` = `0.152.2`
   - `NODE_VERSION` = `22`
9. Save and deploy. Confirm the deployment URL in Cloudflare; do not infer it from the project name.
10. Enable PR/branch previews and inspect branch `feat/frontend-catalog-foundation` before merging PR #3.

## Preview expectations

Without `data/public/videos.json`, the site intentionally shows a placeholder. This is a **UI deployment smoke test**, not a content-release gate. The theme selector and mobile drawer can still be checked; categories will be empty until a public JSON artifact is supplied.

Verify:
- Site loads without 404s for `/css/site.css` and `/js/site.js`.
- Mobile drawer opens and closes; keyboard Escape closes it.
- Light, dark and automatic modes work; refresh retains preference.
- Desktop sidebar remains visible; mobile content is not obscured.
- No credentials, internal Sheets IDs, or unpublished user submissions are present.
- Blue production site and DNS records are unchanged.

## Future content release

The backend must generate a validated, sanitized, versioned public JSON artifact, followed by search indexing and mobile pagination. The current DOM-based search is not production-ready for thousands of items. Deploying the placeholder must not be mistaken for production cutover.

## Rollback

Cloudflare Pages supports prior deployment rollback. For this preview, remove/disable the new Pages project if needed. Do not change Blue DNS or the existing Pages project.
