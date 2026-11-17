# 収集対象・外部リンク・Frontend設定の整理（2026-11-17）

## データ登録の順序と責務

1. Book0 GREEN `collection_requests` は現在 `target_type,target_id` の2列。収集依頼の入力のみを担当し、メタデータの確定・公開承認は行わない。
2. Book1 GREEN `youtube_targets` と `collection_targets_v2` で、解決済みYouTube ID、表示名、チャンネル名、順序を確認する。重複と取得状態を検査する。
3. Book3 `フォームの回答 1` はユーザー投稿の受付記録。検証用の手動候補を入れる場合、実際のフォーム回答・タイムスタンプと混同させない。未承認投稿は公開しない。
4. BackendでBook4 / catalog v2を生成し、Stagingにのみ配信して多媒体カテゴリー・ページネーションを検証する。

## Book0追加候補（未書込）

| target_type | target_id | 元URL | 確認 |
|---|---|---|---|
| PLAYLIST | PLiKWx-Lq44xruEAjQoxCqyigu2Ngd7xpN | https://youtube.com/playlist?list=PLiKWx-Lq44xruEAjQoxCqyigu2Ngd7xpN | タイトル・所有チャンネル未検証 |
| PLAYLIST | PLT9qvmziWJzBTXY3CBVVM_rnFgy3QlttV | https://youtube.com/playlist?list=PLT9qvmziWJzBTXY3CBVVM_rnFgy3QlttV | タイトル・所有チャンネル未検証 |
| CHANNEL | **未解決** | https://www.youtube.com/@kenHorimoto | UC形式のID解決後に登録 |

`si` は識別キーに含めない。既存行との重複検査後に追加する。

## Book3の外部リンク候補（未書込・要出典照合）

過去に提示された12件のうち、現時点で以下の9件を再整理した。元の投稿内容・説明文・完全なURL・公開承認状態は別途照合する。ユーザーが実際にフォームから送信したという扱いにはしない。

| URL | 仮の種別 |
|---|---|
| https://ken-horimoto.com/ | 個人サイト・ブログ |
| https://yurugakuto.com/mypage | 会員サービス |
| https://yurugengo.com/ | 番組公式サイト |
| https://jimbodeai.jp/ | Webサイト |
| https://x.com/yuru_gengo | SNSプロフィール |
| https://note.com/kenhori2/m/m125fc4524aca | 記事・マガジン |
| https://x.com/kenhori2?lang=ja | SNSプロフィール |
| https://yurugakuto.studio.site/ | Webサイト |
| https://pedantic.zaiko.io/ja/e/radioisotope | イベント・申込 |

残りはバリューブックスの書籍リスト、堀元見Google検索リンク、Peatixイベントページ。URL未照合のため捏造しない。

## Frontend検証と設定外部化

- `staging` でカテゴリー別2ページ目、上部・下部ページネーション、URL直アクセス、検索・並び替え、0件時をPlaywrightで確認する。
- YouTubeチャンネル・playlist・一般Webリンク・記事・イベントなど、複数の分類を含むfixtureを追加する。
- `posts` はYuruLinkが発行する読み物・解説、`news` は運営からのお知らせ。Book3の外部記事リンクは自動的にHugoの`posts`にはしない。
- `hugo.toml` はHugo固有の設定、`config/_default/params.toml` はページ件数・初期ソート・表示ラベル等のUIパラメータ、`data/taxonomy.json` はカテゴリー階層とタグ、`schemas/public-catalog-v2.schema.json`（今後追加）は公開JSONの型・必須項目を管理する。
- 本番切替、mainマージ、旧Staging削除、未承認リンク公開は別途承認を要する。

## 既知の検証課題

- Backend PR #13はDraft。実際のBook1/Book2から生成したJSONによる結合検証は未実施。
- Frontendの複数所属UIは実装したが、Playwrightのfixtureが空要素で`:visible`判定に失敗したため、fixtureに表示テキストを追加して再検証中。
- UI設定のTOML移行とJSON Schema実装は未着手。データ契約を固めてから小分けに移行する。
