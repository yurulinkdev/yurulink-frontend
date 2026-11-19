# YuruLink 公開カタログ仕様 — 統合形式

**状態：統合形式を正式採用。** フロントエンドの読み込み処理はstagingに実装済みです。2026-11-19にBackendのBook1/2/Green Book4から3,185件の統合カタログを生成し、stagingへ実配送、Hugo・Cloudflare Preview・Playwright Chromium 8件の検証に成功しました。通常の12時間定期配信およびProductionの初期有効化は未実施です。内部の `schema_version: 2` は機械的な識別子として維持します。

## 対象と分類

公式サイト、有志ツール、記事、SNSプロフィール、動画、ポッドキャストなどの関連リンクを扱います。**`kind`（何か）、`platform`（どこにあるか）、`provenance`（公式性）を混同しない**ことが重要です。

## データ構造

| 配列 | 内容 | 必須項目・関連 |
| --- | --- | --- |
| `items` | 重複しないリンク実体 | `id`, `title`, `url`, `kind`, `platform`, `provenance`, `status` |
| `programs` | 番組・活動 | `id`, `name`。任意: `description`, `parent_id`, `order` |
| `collections` | プレイリスト・テーマ・編集集合 | `id`, `title`, `kind`。任意: `program_id`, `parent_id`, `description`, `order`, `channel_name` |
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

## 左側カテゴリー表示の並び順とプレイリスト名

- Book1の管理対象行順を優先し、公開カタログ生成時に `programs[].order` / `collections[].order` へ昇順の数値を付与する。例: 10, 20, 30。行順を変更したら再生成で反映する。順序の正本はSheets、Frontendではない。
- `order` が欠ける古いJSONでは配列の順番を代用する。カテゴリ表示は `order` の昇順で、同値なら名称順。
- YouTubeチャンネルの表示名は `programs[].name` をそのまま使う。
- プレイリストは `collections[].title` と `collections[].channel_name` から `プレイリスト名[チャンネル名]` を表示する。チャンネル名が未解決の場合はプレイリスト名のみとし、架空のチャンネル名を補わない。
- `channel_name` はYouTube側の所属チャンネルを示す表示用属性で、`program_id`（番組の編集分類）と混同しない。
- Backend developのBook1行順とchannel_titleからorder/channel_nameを生成し、Green Book4を含む3,185件の結合・書込・再実行差分0件を実証済み。Frontend stagingは複数所属カテゴリーの絞り込み・ページネーションを含む8件のPlaywrightテストに成功。main/Productionへの反映は承認待ち。


## ナビゲーション・画像表示の追加規約（2026-11-19）

- Frontendのトップ分類は、YouTubeチャンネル（配下にチャンネル別プレイリスト）、所属先未確定のYouTubeプレイリスト、単発動画、SNSアカウント、公式・非公式・その他Webサイトを表示する。`browse:*` はFrontendだけのフィルタIDであり、公開JSONの`items[].category_id` として永続化しない。
- チャンネル・プレイリストの表示順は既存の`order` を維持する。`channel_name` とチャンネル表示名が正規化後に一意一致した場合だけ暫定的に階層化する。一致しないプレイリストは独立した見出しに残し、推測で誤ったチャンネルに所属させない。将来はYouTubeの安定した`channel_id` に基づく正規の親子リンクを優先する。
- 未所属動画は、現行データでは「チャンネル・プレイリスト未所属」と表示し、Book0未登録という断定はしない。Book0由来と単発投稿の完全な峻別にはBackendで明示的なソース属性を付ける必要がある。
- YouTube画像は`i.ytimg.com` の既存URLをホワイトリスト判定したうえで、標準120px画像から中・高解像度画像へ切り替え、`srcset` / `sizes` / 遅延読み込みを指定する。解像度・帯域のCore Web Vitals実測は別途行う。
- `items[].kind = social_profile` の場合、任意項目`avatar_url`（検証済み公開HTTPS画像URL）、`profile_bio`（公開プロフィール本文）を表示してよい。両方欠けた場合はSNSのアイコンと既存`description` にフォールバックする。現時点の許可画像ホストはXの`pbs.twimg.com` のみ。ブラウザからSNSを直接スクレイピングしない。
- SNSプロフィールの自動更新、画像保存/キャッシュ、更新頻度、利用規約対応、更新日時と公開可否の検証はBackendの別実装課題。現行のFrontend修正だけでは自動追随は実現しない。
- 現行3,185件の全件Hugo HTML描画は維持されている。操作時に動かすDOMは表示対象の最大100件に限定したが、初期HTMLの軽量化（ビルド時分割、検索用索引、初期サーバ描画20件、JS後続読込）は今後の性能課題。


## YouTube動画の再生数と並び替え（2026-11-19）

- 公開JSONのYouTube動画 `items[]` に、数値 `view_count`（0以上の安全な整数）と文字列 `statistics_fetched_at`（UTC ISO 8601）を任意フィールドとして渡す。`schema_version: 2` は変更しない。
- 値はBackendがYouTube Data API `statistics.viewCount` を取得した時点のスナップショットであり、リアルタイム再生数を保証しない。
- カードには取得できた動画の再生数を表示する。0回は有効な数値として扱い、未取得の場合は数値を表示しない。
- `sort=views-desc`（多い順）、`sort=views-asc`（少ない順）をURLクエリから復元し、画面のセレクトで変更する。未取得動画・非YouTubeリンクはどちらの順序でも末尾に置く。
- 再生数順は既存の絞り込み・日本語検索・ページネーションと組み合わせる。動画以外の一覧で再生数ソートが選択されても、非対象リンクを消さない。
- Backend Greenで動画3,618件の統計を取得し、Front stagingへ3,627件を配信済み。公開候補の取り扱いは `main` / Production / Blue-Green有効世代の切替と分離する。
- `tests/browser/staging.spec.mjs` のモックによる欠損・昇順・降順テストに加え、実データの上位20件が数値比較に一致するかの回帰テストを設置した。


## YouTubeプレイリスト・動画形式・ナビゲーション（2026-11-19）

- 元JSONは `items`（動画などのリンク実体）と `collections`（プレイリスト等）を分離したまま維持する。Frontendで `youtube-playlist:ID` のCollectionを表示用のプレイリストカードへ投影し、`https://www.youtube.com/playlist?list=ID` を外部リンクとして使う。
- 「プレイリスト一覧」を選ぶとプレイリストのリンクカード群を表示し、個別プレイリストを選ぶと従来どおり所属動画を表示。見出し自体から該当YouTubeプレイリストへ遷移できる。
- チャンネル階層は `動画` / `プレイリスト`（配下に一覧と個別タイトル）/ `ショート` / `ライブ`。未登録の外部投稿元を自動生成した `YouTube channel UC...` はナビゲーションの独立チャンネルから除外するが、プレイリスト内動画自体は保持する。
- 任意フィールド `video_format` は `video` / `short` / `live`。出所は `video_format_source`。ライブはYouTube `liveStreamingDetails` に基づく。ショートはAPIの直接識別子がないため `#Shorts` 等の明示表示と180秒以下の長さを併用した**暫定候補**。正確性についてはBackend develop `docs/video-format-classification.md` を参照。
- 種類フィルタはチェックボックス複数選択。選択した種類の間はOR、未選択は全種表示。URLクエリ `types=video,playlist,short,live` に状態を保持する。検索・番組カテゴリ・ソート・ページネーションとAND条件で合成する。
- モバイルは画面左端から右へ70px以上、縦移動50px以下の明確なスワイプでカテゴリドロワーを開く。ドロワー内の逆向きスワイプでも閉じる。既存のボタン・Escape操作・フォーカストラップを維持する。
- モバイルヘッダーのブランド名はサイト表示の先頭へ置き、下スクロールで隠れてもよい。ブランドロゴはHugo TOML `params.brand_logo` に公開パスを指定する。現在は画像制作の別ブランチ `feat/brand-html-image-pipeline-20261119` の確定SVG待ちのため、既存の開いた本アイコンを仮表示する。制作ブランチの素材自体は本変更では加工・上書きしない。
- サイドバー末尾の説明はHugo TOML `params.sidebar_notice` に外部化。空文字で非表示とし、投稿承認・公開審査のセキュリティ仕様自体は変更しない。
- Google Driveのブランド正本は `YuruLink_Assets/02-selected/YuruLink-symbol-approved-reference.jpg`。Image-Prompts.md／Assets READMEの素材管理規則に従う。未清書のSVGを最終正本と混同しない。

## 2026-11-19 モバイルのフィルタ折りたたみ・カテゴリ重複整理

- コンテンツの種類フィルタはネイティブHTML `<details>`／`<summary>` を使う。初回は閉じ、右端の下向き山形印で開閉を示す。選択中の種類は閉じた見出しに常時表示する。URLの `types` 指定を復元したときは自動で開く。複数選択・OR判定・解除・URL共有は既存仕様を維持する。
- サイドバーには横断的な「動画（すべて）／プレイリスト（すべて）／ショート（すべて）／ライブ（すべて）」を表示しない。全件横断の入口は「すべてのコンテンツ」で、種類の絞り込みは本文上部に集約する。チャンネル配下の「動画／プレイリスト／ショート／ライブ」と個別プレイリスト選択は維持する。
- 「SNSアカウント」という仮想トップレベルの重複項目は削除。正規カテゴリ「その他のカテゴリー > SNSプロフィール」に一本化する。既存のURLに `category=browse:social` などが指定されても表示ルートは後方互換として維持する。
- ショートの画面上の注記は「暫定判定を含む」。Backendで `manual_verified` を保持できるように改修したが、APIによる縦横比の確定取得にはまだ対応していない。
- ブランドシンボルの暫定抽出SVGは別制作ブランチの検証対象。確定SVGマスターとは扱わず、制作ブランチの画像を本変更で取り込まない。サイトのロゴ指定口 `params.brand_logo` は従来のまま維持する。

## 採用ロゴ・関連番組名・公式性の分類（2026-11-19）

- 採用JPEGを基に背景透過したPNGをGoogle Drive `YuruLink_Assets/02-selected/YuruLink-symbol-approved-transparent.png` に保存。元JPEGは保持。サイト用に同じ輪郭から生成した透過SVG `static/brand/yurulink-symbol-approved.svg` を `hugo.toml` の `params.brand_logo` で指定し、モバイルヘッダーと左サイドバーに共通使用する。SVGの曲線清書・16px等の最終マスター検証は別制作ブランチで継続する。
- Faviconは `static/favicon-32.png` と同SVG、Apple Touch Iconは `static/apple-touch-icon.png`。OGP正式デザインは未決定。候補A `static/ogp/yurulink-light.png` を `params.og_image` でPreviewに暫定指定、候補B `static/ogp/yurulink-dark.png` を保持。実際のOGP生成は別チャットのHTML/CSS+Playwright媒体別パイプラインとの整合を確認する。
- `catalog.item_programs` と `catalog.memberships → collections.channel_name` から関連番組名を解決し、動画カード／リストのメタ行に表示する。仮の `YouTube channel UC...` は人向けの番組名として表示しない。メタ属性 `data-program-labels` も保持する。
- 動画の `video_format`（通常/ショート/ライブ）と `video_relation`（公式・有志・オープンマイク・ゲスト出演）は別属性。未確認動画はBook1の収集対象投稿/関連動画（未確認）として分けるが、Book1収集対象登録だけで公式性は断定しない。
- Frontendは「動画の位置づけ」と「サイト・SNS」の折りたたみ階層を提供する。サイト・SNSの公式／有志／未確認カテゴリーは0件でも表示する。新しいタクソノミーIDはBackend develop `config/taxonomy.v1.json` とFrontend `data/taxonomy.json` で同じ定義を維持する。
- 公式性を確定する入力は審査済み `category_id` または `classification_verified=true` と `provenance` の組。既存Green Book4の検証用9リンクはすべて旧 `provenance=community` であるため、現時点では公式性未確認へ安全側表示し、根拠なしに「有志」と断定しない。投稿カテゴリは提案であり審査済み公式性ではない。
- Google Formsのカテゴリ選択肢更新はBackendコードのdry-runプレビューでのみ反映可能な状態。実フォーム・Book3の元回答・Green Book4の審査値は本変更では更新しない。これらの境界はBackend develop `docs/content-classification-policy.md` を参照する。

## Google Formsとカテゴリ定義の所在（2026-11-19）

- 大カテゴリ・小カテゴリの**定義正本はBackend** `config/taxonomy.v1.json`。Frontendの `data/taxonomy.json` は表示用の複製であり、同じID・表示ラベル・階層を維持する。
- `Book1` はYouTube収集対象チャンネル／プレイリストと表示順の管理であり、一般リンクのカテゴリ定義ではない。`Book3` はGoogle Formからの**カテゴリ選択結果**を受け取る投稿原本であり、カテゴリ辞書ではない。
- フォーム選択肢は `scripts/sync_google_form.py` で `大カテゴリ › 小カテゴリ` へ変換。フォームは単一のドロップダウンから選択する方式で、動的に2段階を連動させるUIではない。
- 投稿したカテゴリは審査前の提案。承認済みカテゴリは共通投稿マスターで管理し、Book4へ統合して公開カタログの `category_id` へ伝搬する。投稿者による公式性の自己申告だけで`classification_verified`を有効化しない。
- 公式性と実体種別は別の情報軸：`kind`（website/social_profile/video等）、`provenance`（official/community/unknown）、`category_id`（大・小カテゴリの葉ID）、`video_relation`（ゲスト出演等）。YouTubeの収集データは関係動画の判定なしに公式扱いしない。
- 不特定多数からの候補投稿に対する24時間後自動承認は、公式性を確定したことにはならない。誤分類リスクが高い公式性値の上書きは別途レビューロジックを持つ。Backend `docs/content-classification-policy.md` を参照。
