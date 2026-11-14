# YuruLink 公開カタログ仕様 — 統合形式

**状態：統合形式を正式採用。** フロントエンドの読み込み処理は開発ブランチに実装済みです。バックエンドの実データ連携とStaging検証は未完了です。内部の `schema_version: 2` は機械的な識別子として維持します。

## 対象と分類

公式サイト、有志ツール、記事、SNSプロフィール、動画、ポッドキャストなどの関連リンクを扱います。**`kind`（何か）、`platform`（どこにあるか）、`provenance`（公式性）を混同しない**ことが重要です。

## データ構造

| 配列 | 内容 | 必須項目・関連 |
| --- | --- | --- |
| `items` | 重複しないリンク実体 | `id`, `title`, `url`, `kind`, `platform`, `provenance`, `status` |
| `programs` | 番組・活動 | `id`, `name`。任意: `description`, `parent_id` |
| `collections` | プレイリスト・テーマ・編集集合 | `id`, `title`, `kind`。任意: `program_id`, `parent_id`, `description` |
| `memberships` | リンクと集合の多対多関係 | `item_id`, `collection_id`。任意: `position` |
| `item_programs` | リンクと番組の多対多関係 | `item_id`, `program_id` |

`items` の任意項目は `description`, `published_at`, `updated_at`, `thumbnail_url`, `tags` です。集合の `kind` は当面 `playlist`, `topic`, `curated` とします。番組は掲載プラットフォームとは別の編集上の分類です。

### 列挙値

- `kind`: `video`, `article`, `website`, `tool`, `social_profile`, `podcast_episode`, `other`
- `platform`: `youtube`, `x`, `instagram`, `spotify`, `web`, `other`
- `provenance`: `official`, `community`, `unknown`（ホスト名だけで公式と判定しない）
- `status`: `published`, `unlisted`（公開JSONには `published` のみ）

## JSON例

以下は説明用の架空データであり、公開データではありません。

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

## 検証・公開ルール

1. URLはHTTP(S)のみ許可します。サムネイルの外部ホストも検証し、危険なURLスキームを拒否します。
2. 種別ごとのID一意性、参照先の存在、所属関係の重複、`parent_id` の循環を検証します。
3. YouTubeは安定したソースIDを利用し、一般リンクには永続的な公開IDを付与します。URL正規化では追跡パラメータだけを慎重に除去し、識別に必要なパスやパラメータを維持します。URL変更だけでIDを変えません。
4. 未承認投稿、内部シートID、メールアドレス、認証情報、審査メモ、非公開レコードは出力しません。
5. 投稿と公開承認を分離し、公式性の分類は明示的に審査します。
6. Book2の動画とプレイリスト所属情報は保持し、照合が完了するまでBook4の正規化は追加的に実施します。
7. リンク単位の検索結果を得るため、Pagefindのカスタムレコードや個別詳細ページを検討します。全件を単一HTMLに並べただけではリンク単位の検索になりません。
8. バックエンドは決定的な順序のJSONを生成し、件数・参照整合性・重複を検証してから原子的に公開します。
9. フロントエンドは `data/public/catalog.json` を読み込みます。旧動画専用形式へのフォールバックは使用しません。投稿を契機に本番へ自動公開しません。

## 未決定事項

- `provenance` に外部の検証済み情報源やリンク単位の編集承認フラグが必要か。
- Book3のどの項目を公開用 `items` に変換し、どの項目を非公開のまま保持するか。
- 外部リンクのサムネイルを表示するか、追跡・画像切れを避けてプラットフォームアイコンを使うか。
