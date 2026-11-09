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
