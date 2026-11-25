# Frontendの環境・ビルド・公開検証

## 環境
Cloudflare Pagesは単一プロジェクト yurulink-frontend。mainはProduction、stagingおよびPR等の非mainブランチはPreview。pages.devは補助ホスト。

| 項目 | staging / Preview | main / Production |
| --- | --- | --- |
| URL・canonical | https://staging.yurulink.com/ | https://www.yurulink.com/ |
| 検索エンジン | noindex=true | noindex=false |
| OGP | STAGING付き | 通常ライト |
| 投稿フォーム | 検証有効 | 審査E2E完了まで無効 |
| GA4 | 無効 | www限定、同意後 |
| RUM・New Relic | 未設定 | 未設定 |

## 設定とビルド
- 共通設定: config/_default/hugo.toml。タイトル、言語、ブランド、SNS、投稿URL、未指定時の安全な既定値。
- 環境別正本: config/staging/hugo.toml と config/main/hugo.toml。両ブランチに同じファイルを保持する。
- 旧Pagesコマンド npm run css:build && hugo --minify は変更しない。css:buildのprepare-site-build.mjsが選択した設定を追跡対象外のconfig/production/hugo.tomlへ生成する。Cloudflareの実ブランチを優先し矛盾する明示指定は拒否する。通常のローカルビルドはstaging既定。
- 明示環境のビルド: hugo --minify --environment main または staging（CSS事前生成）。hugo server --environment staging で開発。npm run build は従来どおり選択・生成・ビルドを行う。旧コマンド互換ファイルは生成物で、編集・コミットしない。
- 将来Cloudflareのビルド設定を npm run build に統一し、明示環境引数方式へ移行する場合は別途実環境検証・承認を行う。

## 昇格と検証
stagingで開発し、Smoke・両環境ビルド・対象SHA一致Preview・Chromium回帰に合格したうえでmainへのPR昇格を承認する。main専用運用Workflowは定義を共有し実行条件で分離する。通常の検証済みcatalog.jsonと月別履歴の自動配信はコード昇格から分離する。DNS・公開世代変更は別承認。

実設定の確認: 2026-11-23のCustom Domain、旧独立Pages廃止、DNS権限試験は[旧版の証跡](https://github.com/yurulinkdev/yurulink-frontend/blob/e7b1193009354ed80bafdd1db5e837fc215df63c/docs/environments.md)に保持。旧PagesのHTTP404は正常な廃止状態として読み取り専用監査で確認する。Cloudflare設定は本変更では変更しない。
