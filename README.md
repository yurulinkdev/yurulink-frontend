# YuruLink フロントエンド

YuruLinkの公開リンク集を、バックエンドが生成する**統合形式の公開JSON**からHugoで静的サイトとして構築し、Cloudflare Pagesで配信します。

## 技術構成

- Hugo Extended 0.152.2
- Node.js 22
- Tailwind CSS v4（daisyUIは使用しません）
- Cloudflare Pages
- 公開データ: `data/public/catalog.json`（バックエンドから供給する予定）

## ローカル実行

```sh
npm install
npm run build
```

開発時は別々のターミナルで `npm run css:watch` と `hugo server` を実行します。CSSはビルド時に生成し、実行時の外部CSS CDNには依存しません。

## 表示機能

PCでは左サイドバー、スマートフォンではカテゴリー用ドロワーを表示します。検索、カテゴリー絞り込み、カード／リスト切替、ライト／ダーク／OS連動テーマを提供します。テーマ設定はブラウザに保存します。

## データと公開の制約

- **公開対象は承認済みレコードのみ**です。APIキー、認証情報、非公開Google Sheetsデータ、投稿者の個人情報は配置しません。
- `catalog.json` が存在しない場合は準備中画面を表示します。
- 現行のDOMベース検索は少量データ向けです。数千件の実データを初期HTMLへ一括描画する構成は本番採用せず、Pagefind等の検索と分割表示を検証します。
- 公開データの自動配信、実データでのStaging検証、本番公開は未完了です。

## 関連文書

- [統合形式の公開データ仕様](docs/public-catalog-contract-v2.md)
- [デザイン仕様](docs/design-system-phase2.md)
- [環境・デプロイ設計](docs/environments.md)
