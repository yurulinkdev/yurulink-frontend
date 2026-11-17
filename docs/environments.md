# Cloudflare Pages 環境・デプロイ設計

## 環境

| 用途 | Pagesプロジェクト | Gitブランチ | 状態 |
| --- | --- | --- | --- |
| 本番 | `yurulink-frontend` | `main` | 仮画面。正式公開前 |
| 検証 | `yurulink-frontend`（Preview） | `staging` | デプロイ・Playwrightともに成功（2026-11-17） |
| PR確認 | `yurulink-frontend`（Preview） | 開発ブランチ | 個別PRの動作は未検証 |

本番: https://yurulink-frontend.pages.dev/  
検証: https://staging.yurulink-frontend.pages.dev/ （ブランチエイリアス。正式運用URLとしての疎通は別途確認）\n\n検証済みデプロイ固有URLは GitHub Actions の `DEPLOYMENT_URL` を参照。旧検証URL `https://yurulink-frontend-staging.pages.dev/` は移行期間中のみ維持。

## ビルド設定

- Node.js: `22`、Hugo Extended: `0.152.2`
- ビルド: `npm run css:build && hugo --minify`
- 出力: `public`、ルート: リポジトリ直下
- 依存インストール: ロックファイル未導入時は `npm install`。ロックファイル導入後は `npm ci` を使用する。

単一PagesプロジェクトのProduction/Previewでビルド条件を揃え、検証済みの同一公開データを本番に昇格させます。公開フロントエンドには秘密情報を含めません。

## 反映手順

1. 開発ブランチでビルドとテストを実施する。
2. `staging`へのPush後、`scripts/wait-cloudflare-pages.py` が対象SHAのPreviewデプロイ成功を待機し、返された固有URLでPlaywrightを実行する。
3. 公開データの件数、URL、参照整合性、未承認データの除外を検証する。
4. **承認後**に`main`へマージし本番へ反映する。

既存BlueサイトのDNS・ドメインは切替承認まで変更しません。障害時はPagesの過去デプロイへロールバックするか、Gitの変更を戻します。

## 2026-11-17 移行検証

- `staging`コミット `d45de61ad6e15b9ae53a734933fa4eb4d8e652b5` に対してSmoke Test、Pages Preview待機、Playwrightがすべて成功。
- 実行ログ: https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44041615658
- Preview確認: https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44041615724
- デプロイ待機は15秒間隔、最大600秒、SHA/ブランチ/環境一致で判定する。旧Staging Pagesプロジェクトはまだ削除しない。
- Productionへのマージ、カスタムドメイン・DNS変更、旧Stagingの削除はこの検証の対象外。
