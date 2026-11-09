# Public JSON contract (draft)

The backend will publish a validated JSON artifact to `data/public/videos.json` in this repository. Hugo reads it as `.Site.Data.public.videos`.

Expected shape (illustrative only; no production dataset is included):

```json
{
  "schema_version": 1,
  "videos": [
    {"id": "example", "title": "Example", "url": "https://www.youtube.com/watch?v=example"}
  ]
}
```

This is a provisional interface, **not** a finalized schema. Before enabling delivery, decide whether the canonical frontend model represents videos, playlists, channels, external links, or all of these. Do not publish internal spreadsheet IDs, API keys, credentials, private submissions, or unapproved data.

Frontend deployment: Cloudflare Pages (not configured yet).

## Frontend implementation (first pass)

The catalog accepts optional `source` (human-readable program name) and `published_at` (YYYY-MM-DD display date) fields per video. Required fields are `title` and an absolute HTTP(S) `url`. Search filters titles and program labels client-side; no analytics or third-party JavaScript is loaded.

This first pass deliberately uses no committed production fixture. Missing JSON shows a migration placeholder. Backend must produce a versioned, validated artifact before preview and production deployment. The schema remains provisional pending Book4/external-link mapping.

Before cutover: validate counts, unique identifiers, no private fields, build and smoke-test a Cloudflare Pages preview, and document rollback to Blue. No domain change is authorized by this PR.
