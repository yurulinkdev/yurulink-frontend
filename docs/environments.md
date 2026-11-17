# Cloudflare Pages 環境・デプロイ

## 環境構成

| 用途 | Pagesプロジェクト | ブランチ | URL |
| --- | --- | --- | --- |
| Production | `yurulink-frontend` | `main` | https://yurulink-frontend.pages.dev/ |
| Preview（Staging） | `yurulink-frontend` | `staging` | https://staging.yurulink-frontend.pages.dev/ |
| PR Preview | `yurulink-frontend` | 開発ブランチ | デプロイごとのURL |

旧独立プロジェクト `yurulink-frontend-staging` は廃止対象です。削除操作はCloudflareアカウントの管理者が行います。削除完了は未確認です。

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
