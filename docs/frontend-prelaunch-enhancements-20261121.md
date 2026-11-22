# 本公開前Frontend改修・通知アイコン（2026-11-21）

## 更新範囲

対象：Frontend `staging`。Productionの `main`、Cloudflare DNS、Blue/Green有効系、実Google Forms回答データは変更していない。

| 要件 | 改修・実装箇所 | 状態と注意 |
| --- | --- | --- |
| 動画種別 | `layouts/index.html` | 各動画カードのチャンネル名／分類行に「動画」「ショート」「ライブ配信」を追加。既存 `video_format` を使い、分類の確実性は従来の出所検証に従う。 |
| 投稿CTA | `hugo.toml` / `layouts/partials/site/submission-cta.html` / `site/sidebar.html` | PCサイドバー・スマホドロワーの上方に「リンクを投稿する」。公開の回答用 `/forms/d/e/.../viewform` を使い、編集用URLを表示しない。フォームの実受付状態・Book3回答先接続は未検証。 |
| 高評価順 | `layouts/index.html` / `static/js/site.js` | `sort=likes-desc`、YouTube動画のみ、未取得は末尾。任意の `items[].like_count` がない現在の公開カタログでは順位に実データが反映されない。Backend Draft PR #16で収集・伝搬を別途実装。 |
| プレイリスト画像 | `layouts/index.html` | `collections[].thumbnail_url` が信頼できるYouTubeホストなら優先。なければ公開済み所属動画の最初に発見されたサムネイルへ代替し、それもなければ従来の記号。**所属データは再生順を保証しないため、現状の代替画像はYouTube公式の先頭動画とは限らない。** 厳密に先頭動画を採用するにはPlaylistItems API等の順序情報が必要。 |
| SNSアイコン | `static/icons/social/*.svg` / `site/social-links.html` / `layouts/index.html` | Simple Iconsの単色SVGをローカル配信。外部CDNリクエストなし。XのYuruLink公式URLは既存値を維持、未設定のSNS URLは新規に創作しない。 |
| 通知アイコン | `static/brand/notifications/*.svg` とAutomation Labツールキット | 既存単色シンボルの6パスをそのまま保持し、右下にバッジ合成（開発：歯車/紺、運用：メガホン/茶、監視：警告/琥珀）。SVGは3種、PNGは256px/512pxをHTML-to-ImageのCIで生成。 |

## 制作正本と証跡

- ベクターマスター（Frontend）：`static/brand/yurulink-symbol-master.svg`（Git blob `6524fb7732ba69a4faa7a17100697931753c8133`）。採用済みJPEG由来の6パーツを改変せず再利用する。
- HTML/CSS→PNGの再現可能な制作コード：Automation Lab `feat/brand-html-image-pipeline-20261119` の `visuals/render-notification-icons.mjs`。
- 出力：`visuals/assets/generated/notifications/{development,operations,monitoring}.{svg,256.png,512.png}`（実ファイルは `<kind>-256.png` と `<kind>-512.png`）。
- ブランド生成CI [Run 44902495577](https://github.com/yurulinkdev/yurulink-automation-lab/actions/runs/44902495577)：SVG構造・透過PNG各サイズ検証成功。フロントの通知用SVGは `static/brand/notifications` に配備。
- Simple Iconsの出所、商標の注意は [social-icon-license.md](social-icon-license.md) に記録。
- Backend [Draft PR #16](https://github.com/yurulinkdev/yurulink-backend/pull/16)：YouTube高評価数をGreen Book2の空欄S/Tへ書込むスクリプトを準備。既存のA:R列は保護。現時点でGoogle Sheetsへの実書込やFrontend公開JSONの実データ再配信は行っていない。

## 公開前確認

1. Frontendの同一SHA Smoke／Cloudflare Preview SHA一致／Playwrightブラウザ回帰が全件成功すること。
2. 投稿フォームの回答受付・回答先Book3をフォーム所有者が確認し、CTA公開の適否を判断する。編集用URLがHTMLに含まれていないこと。
3. 検証可能な高評価数が公開カタログへ入るまでは、UIは完成していてもソートの実データ検証は未完了とする。必要ならメニューを「準備中」と表示する判断が必要。
4. プレイリストの真の先頭動画画像を採用するには `playlistItems.list` のposition等、順序が確定できるデータをBackendで持つ。現段階は画像の表示フォールバックを優先。
5. 各ブランドの商標利用と通知アイコンの16/32px視認性を確認。画像は開発Preview用であり、本番の採用確定ではない。
