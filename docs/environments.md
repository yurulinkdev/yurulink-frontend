# Cloudflare Pages 環境・デプロイ設計

## 環境

| 用途 | Pagesプロジェクト | Gitブランチ | 状態 |
| --- | --- | --- | --- |
| 本番 | `yurulink-frontend` | `main` | 仮画面。正式公開前 |
| 検証 | `yurulink-frontend-staging` | `staging` | 作成済み。最新開発ブランチの反映は未確認 |
| PR確認 | Cloudflare Pagesのブランチプレビュー | 開発ブランチ | 設定・動作は要確認 |

本番: https://yurulink-frontend.pages.dev/  
検証: https://yurulink-frontend-staging.pages.dev/

## ビルド設定

- Node.js: `22`、Hugo Extended: `0.152.2`
- ビルド: `npm run css:build && hugo --minify`
- 出力: `public`、ルート: リポジトリ直下
- 依存インストール: ロックファイル未導入時は `npm install`。ロックファイル導入後は `npm ci` を使用する。

両環境でビルド条件を揃え、検証済みの同一公開データを本番に昇格させます。公開フロントエンドには秘密情報を含めません。

## 反映手順

1. 開発ブランチでビルドとテストを実施する。
2. 検証用ブランチ・Pages環境で表示、検索、カテゴリー、モバイル操作、テーマを確認する。
3. 公開データの件数、URL、参照整合性、未承認データの除外を検証する。
4. **承認後**に`main`へマージし本番へ反映する。

既存BlueサイトのDNS・ドメインは切替承認まで変更しません。障害時はPagesの過去デプロイへロールバックするか、Gitの変更を戻します。
