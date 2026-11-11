# YuruLink public catalog contract — proposal v2

Status: **proposed, not yet implemented**. This supersedes the video-only schema v1 as the target model. Existing Hugo code still consumes `data/public/videos.json`; do not remove it until the renderer is migrated.

## Scope

Catalog links to official websites, fan-built tools and useful sites, blog articles, X/Instagram and other social profiles, single videos, podcast episodes, and other related resources. A link's **kind** (what it is) must not be conflated with its **platform** (where it is hosted) or **provenance** (official/community/unknown).

## Canonical entities

- `items`: unique linked resources, independent of collections. Required: `id`, `title`, `url`, `kind`, `platform`, `provenance`, `status`. Optional: `description`, `published_at`, `updated_at`, `thumbnail_url`, `tags`.
- `programs`: `id`, `name`, optional `description`, `parent_id`. A program is an editorial grouping, not a platform.
- `collections`: `id`, `title`, `kind`, optional `program_id`, `parent_id`, `description`. Kinds initially `playlist`, `topic`, `curated`.
- `memberships`: unique `item_id` + `collection_id` pairs. Optional `position`; one item can appear in many playlists without duplicating the item.
- `item_programs`: unique `item_id` + `program_id` pairs. A link may be relevant to multiple programs.

### Controlled vocabularies

- `kind`: `video`, `article`, `website`, `tool`, `social_profile`, `podcast_episode`, `other`.
- `platform`: `youtube`, `x`, `instagram`, `spotify`, `web`, `other` (extend by additive versioned changes).
- `provenance`: `official`, `community`, `unknown` (do not infer official status from the hostname alone).
- `status`: `published`, `unlisted` (only published items may appear in the public artifact).

### Illustrative JSON (synthetic data, not a real publication)

```json
{
  "schema_version": 2,
  "generated_at": "2026-11-11T00:00:00Z",
  "programs": [{"id": "program:example", "name": "サンプル番組"}],
  "collections": [{"id": "collection:example", "title": "サンプルプレイリスト", "kind": "playlist", "program_id": "program:example"}],
  "items": [
    {"id": "youtube:example", "title": "サンプル動画", "url": "https://www.youtube.com/watch?v=example", "kind": "video", "platform": "youtube", "provenance": "unknown", "status": "published"},
    {"id": "web:example", "title": "サンプルツール", "url": "https://example.org/tool", "kind": "tool", "platform": "web", "provenance": "community", "status": "published"},
    {"id": "x:example", "title": "サンプルSNSプロフィール", "url": "https://x.com/example", "kind": "social_profile", "platform": "x", "provenance": "unknown", "status": "published"}
  ],
  "memberships": [{"item_id": "youtube:example", "collection_id": "collection:example"}],
  "item_programs": [{"item_id": "youtube:example", "program_id": "program:example"}]
}
```

## Publication and validation rules

1. Reject non-HTTP(S) URLs; validate hosts for external media thumbnails and forbid unsafe URL schemes.
2. Require unique IDs within each entity type and valid foreign keys. Enforce unique membership pairs; detect cycles in `parent_id` hierarchies.
3. Use stable source-native IDs for YouTube resources; assign persistent internal public IDs for arbitrary links. Canonicalize URLs conservatively (strip tracking parameters, preserve identity-bearing parameters and paths). A changed URL must not silently change a stable ID.
4. Never export private submissions, spreadsheet identifiers, email addresses, credentials, review notes, or unpublished records.
5. Separate submitted links from approved public items. Attribution/provenance must be explicitly reviewed.
6. Keep all existing Book2 rows and playlist memberships; Book4 normalization is additive until reconciliation succeeds.
7. For the static frontend, generate individual search records (e.g. Pagefind custom records or detail pages); indexing one giant HTML page will not yield per-item search results.
8. The backend writes a versioned JSON artifact with deterministic ordering and an atomic publishing step; validate counts, referential integrity and duplicate IDs before publishing.
9. Frontend migration: implement v2 reader and navigation/search, then retire `videos.json` only after QA. No automatic production release from a raw user submission.

## Open decisions

- Whether `provenance` needs a third-party verified source or a per-link editorial approval flag.
- Which Book3 form fields and Book4 columns map to `items` and which remain private.
- Whether to publish external link preview thumbnails or use platform icons to avoid tracking and broken image dependencies.
