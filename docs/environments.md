# Frontendの環境・ビルド・公開検証

## 環境構成

Cloudflare Pagesは`yurulink-frontend`という**単一プロジェクト**で運用し、GitブランチをProduction／Previewへ対応させます。

| 用途 | Gitブランチ | Pages環境 | 既存ホスト |
| --- | --- | --- | --- |
| 公開版 | `main` | Production | https://yurulink-frontend.pages.dev/ |
| 検証版 | `staging` | Preview | https://staging.yurulink-frontend.pages.dev/ |
| 個別変更の確認 | PR等のブランチ | Preview | デプロイ固有URL |

カスタムドメインを接続する場合は、ProductionとStagingのURL・DNS・TLS・検索インデックス制御を別々に検証します。想定する公開用ホストは`www.yurulink.com`、Staging用は`staging.yurulink.com`ですが、実接続済みかどうかはCloudflareの現在設定で確認してください。

## ビルド仕様

- Node.js 22、Hugo Extended 0.152.2、Tailwind CSS v4
- ビルドコマンド：`npm run css:build && hugo --minify`
- 出力ディレクトリ：`public`
- 依存関係：Lockfileがある場合は`npm ci`、ない場合は`npm install`を選択
- Hugoの設定入口：`hugo.toml`、`assets/css/`、`layouts/`

`staging`には`noindex=true`とPreview URL用`baseURL`を設定しています。Productionへ同じ設定をそのまま持ち込むと、canonical・OGP・robots等が不適切になります。**本番反映前にブランチ／ビルド環境別に`baseURL`・検索制御・計測ホスト条件を切り替え、Cloudflare側の実ビルド設定と一致させます。**

## サービスの相互作用

```mermaid
sequenceDiagram
    participant GH as GitHub
    participant CI as GitHub Actions
    participant CF as Cloudflare Pages
    participant Test as Playwright
    GH->>CI: stagingにコミット
    GH->>CF: Git連携でPreviewデプロイ
    CI->>CI: Hugo Smoke Test
    CI->>CF: branch・commit SHA・環境を照合
    CF-->>CI: 該当Previewの状態
    CI->>Test: 対象Preview URLを指定
    Test-->>CI: ブラウザ検証結果
    Note over CI,CF: Preview成功はProduction公開の承認ではない
```

## 検証の必須条件

1. **コードとJSON**：現行の公開データ契約、分類定義、必要なプログラムを同じコミットに含める。
2. **Smoke**：Hugoビルド、リンク、基本ページ、404、公開データの構造を確認する。
3. **Preview**：`scripts/wait-cloudflare-pages.py`でブランチと対象コミットSHAの一致したデプロイを検査する。以前の別SHAの成功を流用しない。
4. **ブラウザ**：Playwright Chromiumで検索・ナビ・カテゴリ保存・ページネーション・カード／リスト・投稿導線を検査する。
5. **本番反映前**：Production環境用のビルド設定、noindex解除の妥当性、canonical／OGP、GA4同意・ホスト制限、公開対象JSONを確認する。

`staging`から`main`へのマージはコード変更だけでなくPages Productionの自動デプロイを伴い得る操作です。事前承認なしに実施しません。BackendのBlue／Green有効世代、初回データ公開、DNS切替も独立した承認対象です。

## 検証の起動方法

通常のコードPushに対するSmoke・Preview・ブラウザ検証を維持しています。チャットからの限定された追加検証は`ops/requests/frontend-validation.json`を入力とする同一Workflow内Jobで行います。使用可能なアクション、JSONの書式、結果と対象SHAの照合は[Staging ChatOps](staging-chatops.md)に従ってください。

障害時には前回検証済みのデプロイまたはGitコミットへ復旧します。複数のCloudflare Pagesプロジェクトに同一Gitブランチを接続するとデプロイが重複するため、運用台帳では接続先・Custom Domain・環境変数を確認します。
