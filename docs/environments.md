# Cloudflare Pages 環境・デプロイ

## 環境構成

| 用途 | Pagesプロジェクト | ブランチ | URL |
| --- | --- | --- | --- |
| Production | `yurulink-frontend` | `main` | https://yurulink-frontend.pages.dev/ |
| Preview（Staging） | `yurulink-frontend` | `staging` | https://staging.yurulink-frontend.pages.dev/ |
| PR Preview | `yurulink-frontend` | 開発ブランチ | デプロイごとのURL |

旧独立プロジェクト `yurulink-frontend-staging` は廃止・ユーザー削除待ちです。2026-11-22のGitHub check-runでは、同じ `staging` SHAに現行PagesのPreviewと旧プロジェクトの両方がデプロイ成功を報告しました。旧プロジェクトのGit連携が残っているため、`staging` Pushで重複デプロイされます。GitHub Actionsから旧Pagesへ直接デプロイする経路はなく、旧プロジェクトの削除完了は未確認です。

## ビルド設定

- Node.js 22 / Hugo Extended 0.152.2
- `npm run css:build && hugo --minify`
- 出力ディレクトリ `public`
- 依存インストールはロックファイルの有無に合わせて `npm ci` または `npm install` を使用

## 検証と反映

1. 開発ブランチでビルド・テストする。
2. `staging` に反映し、GitHub ActionsでSmoke Testを実施する。
3. `scripts/wait-cloudflare-pages.py` がコミットSHA、ブランチ、Preview環境の一致するデプロイ完了を待つ。
4. Playwright Chromiumで対象デプロイの検索、カテゴリー、ページネーション、表示を検証する。
5. 公開データの件数・参照整合性・未承認投稿の除外を確認し、承認後に `main` へ反映する。

各CIの成否は対象コミットごとに確認します。Previewデプロイ成功だけでブラウザテスト成功と判断しません。

FrontendのProduction/PreviewとBackendのBlue/Greenは独立した環境管理です。Frontendの本番反映やDNS変更は別途承認を要します。障害時は検証済みデプロイまたはGitコミットへ戻します。

## 旧独立Pagesプロジェクトの廃止

- [x] Stagingの通常CI・Playwrightは現行 `yurulink-frontend` のPreviewを対象にする。`playwright.config.mjs` の環境変数未設定時のURLも現行Previewに統一。
- [x] 旧Pagesとの比較用Workflow・スクリプトは廃止。Cloudflare棚卸しWorkflowのAPI取得対象は現行Pagesだけとする。
- [ ] Cloudflare管理画面で旧プロジェクトのCustom Domains・依存DNS・環境変数・Git連携を確認し、必要な設定を現行Pagesに移行する（実値を資料へ記録しない）。
- [ ] **ユーザーが** `yurulink-frontend-staging` を削除する。現行 `yurulink-frontend` は削除しない。
- [ ] 削除後に現行Pagesの `staging` Preview、GitHub ActionsのSHA一致、ブラウザ表示を再確認する。削除前のCI成功は削除後の疎通保証ではない。

## Stagingのチャット起点検証

`staging`は継続開発の主経路として利用します。通常のコードPush時のSmoke／Cloudflare Preview SHA一致／Playwrightは従来どおり自動実行します。チャット経由で特定のコードCommitを再検証したい場合は、[`ops/requests/frontend-validation.json`](../ops/requests/frontend-validation.json) の変更Pushにより、[直接実行Workflow](../.github/workflows/frontend-validation-request.yml)を起動します。リクエストのみのPush時は通常の3本のCIを重複実行しません。操作種別・対象SHA・結果確認・未解決の回帰テストは [Staging ChatOps運用手順](staging-chatops.md) を参照してください。


## 2026-11-21 チャット起点検証と未完了の区別

2026-11-21のFrontend staging SHA `47f58aa12948c9a9249db15ae654451e2417b0e2`で、リクエストJSON Pushによる**同一Workflow内の検証**を実証（Run `44856007489`）。通常コードPushのSmokeとCloudflare Preview SHA一致も成功した一方、Browser（Run `44856007491`）には3件失敗が残る。Productionへの昇格条件は満たしていない。

ドメイン`yurulink.com`は取得方法・期間を含めて検討中。将来の`www.yurulink.com`（main）、`staging.yurulink.com`（staging）、Apexの301は**設計目標**であり実設定ではない。現在の`pages.dev`ホストを変更していない。


## 2026-11-21 ドメイン有効化・Staging独自ホスト接続準備

Cloudflareダッシュボードのユーザー提供画像では `yurulink.com` のゾーンが有効化済み。独立した[DNS監査 Run 44898082254](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44898082254)で、1.1.1.1と8.8.8.8の両方が `kim.ns.cloudflare.com` と `lakas.ns.cloudflare.com` を返した。管理画面で割り当てられたNSとの厳密な値照合・DNSSEC設定・全DNSレコード・Pages独自ホストの登録は未確認。Productionの有効化と混同しないこと。

Staging `hugo.toml`の `params.noindex = true` と共通HTMLメタの `noindex, nofollow` を実装した。記事も含めたPlaywrightテストを追加した。これは検索エンジン登録の抑止であり、認証・アクセス制限ではない。必要に応じてStagingを非公開にする場合は別途Cloudflare Accessを設計する。

現状の `baseURL` は現行単一PagesプロジェクトのPreviewホスト `https://staging.yurulink-frontend.pages.dev/`。Pagesへ `staging.yurulink.com` をCustom Domain登録した後、**DNSのCNAMEを `staging.yurulink-frontend.pages.dev` に設定し、Proxiedを維持**する。実TLS・Stagingビルド同一性を検証した後に、Stagingの `baseURL` を新ホストへ切り替える。

Cloudflareとの直接連携はないため、Pages登録・DNS操作は未実施。www/ProductionおよびApexリダイレクトは明示承認を待つ。詳細手順は[ドメイン導入手順](domain-and-frontend-feedback-no3-20261120.md)。
