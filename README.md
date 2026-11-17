# YuruLink フロントエンド

YuruLinkは、関連番組・活動のYouTube動画、プレイリスト、Webサイト、記事、SNS、イベントなどを横断して閲覧する静的リンク集です。バックエンドが生成する統合公開カタログをHugoでサイト化し、Cloudflare Pagesで配信します。

## システム構成

```text
Google Sheets / Forms
       │
       ▼
yurulink-backend ── 公開用 catalog.json ──▶ yurulink-frontend
                                                │
                                         Hugo + Tailwind CSS
                                                │
                                         Cloudflare Pages
                                         ├─ main: Production
                                         └─ staging: Preview
```

公開カタログの格納先は `data/public/catalog.json`、形式識別子は `schema_version: 2` です。データにはリンク実体 `items`、番組 `programs`、コレクション `collections`、関連付け `item_programs`・`memberships` を含みます。公開データの生成・自動配送はバックエンド側の実装対象です。

## 技術構成

| 要素 | 構成 |
| --- | --- |
| 静的サイト | Hugo Extended 0.152.2 |
| ビルド | Node.js 22、npm |
| スタイル | Tailwind CSS v4 |
| 配信 | Cloudflare Pages |
| UI | PCサイドバー、モバイルドロワー、カテゴリー絞り込み、検索、並び替え、ページネーション、カード／リスト切替、テーマ切替 |
| テスト | GitHub Actions、Hugo Smoke Test、Cloudflare Preview検証、Playwright Chromium |

カテゴリーは主カテゴリーに加えて番組・プレイリストへの複数所属を扱います。現行の検索・ページネーションはクライアント側で実行します。

## 環境と検証

| Gitブランチ | Pages環境 | URL |
| --- | --- | --- |
| `main` | Production | https://yurulink-frontend.pages.dev/ |
| `staging` | Preview | https://staging.yurulink-frontend.pages.dev/ |

StagingへのPushでSmoke Test、対象コミットSHAに対応するPreviewデプロイ確認、Playwrightテストを実行します。本番反映は検証と承認を経て実施します。

## ローカル実行

```sh
npm install
npm run build
```

開発サーバーでは `npm run css:watch` と `hugo server` を別ターミナルで起動します。

## データ公開

公開JSONは承認済みの外部投稿と公開対象の収集データから生成します。非公開の回答原本、管理メモ、認証情報は公開サイトに含めません。現在の `data/public/catalog.json` は代表サンプルで、全件の自動配信・大量データ対応は整備中です。

## 仕様・運用資料

- [公開カタログ形式](docs/public-catalog-contract-v2.md)
- [環境・デプロイ](docs/environments.md)
- [デザイン](docs/design-system-phase2.md)
- [Backendリポジトリ](https://github.com/yurulinkdev/yurulink-backend)
