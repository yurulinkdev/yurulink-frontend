# Frontend simplification and v1 retirement gate

## Decisions (2026-11-14)
- Target renderer: public catalog schema v2, `data/public/catalog.json`.
- Legacy `data/public/videos.json` is transitional. **Do not remove its fallback until v2 export and staging QA are verified.**
- CSS framework: Tailwind CSS v4 only; remove unused daisyUI plugin and package.
- Keep existing HTML structure and semantic color tokens; avoid a full CSS rewrite.

## Preconditions for deleting v1 renderer
1. Backend v2 export exists and passes contract checks for status, URLs, IDs, and membership references.
2. Frontend CI tests a representative v2 fixture (published, unlisted, invalid URL, missing optional fields).
3. Staging renders real v2 data; category navigation, search, grid/list, mobile drawer, and theme selection are checked in a browser.
4. Compare published item counts and representative links against the approved backend export.
5. Obtain explicit approval before production migration or removal of fallback.

## Follow-up cleanup
- Remove the v1 `else` branch from `layouts/index.html` only after gates 1–4.
- Update `docs/public-catalog-contract-v2.md` implementation status after verification.
- Consider merging overlapping CI workflows after checking required GitHub status checks.
- Ensure package dependencies are reproducible (commit lockfile and use `npm ci` when ready).
