# 外部SNS・note投稿単体へのリンク分類（2026-11-20確定）

## 対象

- Xの公開投稿：`kind=social_post`, `platform=x`, `category_id=x_post`。
- Instagramの公開投稿：`kind=social_post`, `platform=instagram`, `category_id=instagram_post`。
- Instagramの公開リール：`kind=social_post`, `platform=instagram`, `category_id=instagram_reel`。URLは`instagram.com/reel/...`を想定。
- noteの記事単体：`kind=article`, `platform=note`, `category_id=note_article`。
- noteのシリーズ・マガジン等：`kind=article`, `platform=note`, `category_id=note_series`。シリーズ全体のリンクを1つのItemとして扱い、所属記事をCollectionで表現する余地を残す。

`items[].platform`は表示元サービス、`kind`はリンク実体、`category_id`はユーザー向け分類である。既存`schema_version=2`の契約を保ち、URLによるプラットフォーム推定だけで公式性を判断しない。

## 受付と公開

1. 公開URL・タイトル・説明をGoogle Formsまたは審査用のCSV一括取込から受領する。
2. Instagramの自動収集・スクレイピング・画像再配信・自動埋め込みは行わない。非公開アカウント、削除投稿、ログインが必要な投稿は公開できないことがある。
3. 重複URL、投稿先、分類、公式性、公開可否を審査する。管理者の承認済みのみBook4と公開カタログへ渡す。投稿者のカテゴリ指定は承認を意味しない。
4. Google Form側の分類選択肢実更新、Book3→SubmissionMaster→Book4のE2E処理は未完了。分類の正本はBackend`config/taxonomy.v1.json`。

現状のFrontend実装は**これらの種類を表示できる分類受け皿**まで。外部リンク実データの登録・審査・公開は別工程。

公式：
- https://www.facebook.com/help/instagram/196883487377501
- https://www.help-note.com/hc/ja
