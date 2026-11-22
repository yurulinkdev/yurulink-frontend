# Frontend main同期：統合準備・確認表（2026-11-22）

> 状態：**同期準備中（選択肢A）**。本書は明示的な作業途中の確認表です。Production公開手順の承認・実施を意味しません。

## 対象・境界

- リポジトリ：`yurulinkdev/yurulink-frontend`
- 現行開発：`staging`、本番基準：`main`
- 統合準備ブランチ：`integration/main-sync-prep-20261122`
- 本番同期のレビュー用Draft：PR #13（`staging` → `main`）
- 作業対象外：Backend `develop` → `main`、Cloudflare Pages Production、DNS、カスタムドメイン、Blue/Green有効世代、Google Sheets/Forms実データ
- GitHub `main`へのマージは別途ユーザー承認が必要。

## 差分の解消方針

比較基準：`main=e44627c6c9b247a145c2b6b62d09ca0e7fc30474`、`staging=7579f5021faa96dc00eb606dc76e7c0ecd37fec6`。

| 分類 | 方針 |
| --- | --- |
| UI、公開カタログ、検索、カテゴリ、Hugo設定、ブラウザ検証 | 現行 `staging` を維持。 `main`の古い実装で巻き戻さない |
| Cloudflare Pages読み取り専用棚卸し | `main`固有Workflow 2件と要求JSONを維持 |
| Discord通知 | `main`固有のルーティング設定・検証・送信モジュールを保持。未設定スレッドへの送信は行わない |
| 共通変更ファイル | `staging`を優先。`layouts/index.html`と`static/js/site.js`にはmainのカテゴリ順序制御を含むことを確認 |
| `scripts/wait-cloudflare-pages.py` | 両ブランチのGit blob SHAが同じためそのまま |
| 旧`content/news/_index.md`／`content/posts/_index.md` | `staging`での意図的削除を維持 |
| `main`固有の旧移行計画・Discord設計書 | 履歴・参照の欠損防止のため保持。確定仕様は最新`docs/environments.md`および現行実装を優先。別チャットの文書整理で再判定 |

準備ブランチの統合コミットは、`staging`を第1親、`main`を第2親とし、`staging`のGit treeに`main`固有の8ファイルだけを追加した。**本番ブランチは変更しない**。

## Production昇格前の必須ゲート

1. **差分**：本書の8ファイル保持・廃止済み2ファイルの非復活・現行UI/仕様維持をGitHubで再検証。
2. **CI**：変更後の同一`staging` SHAでHugo Smoke、Cloudflare PagesのSHA一致Preview、Chromium E2Eを確認する。テストのスキップを合格とみなさない。
3. **SEO/URL**：現行`hugo.toml`は`baseURL=https://staging.yurulink-frontend.pages.dev/`と`params.noindex=true`。同一ファイルを`main`へ統合しただけではProduction用URL・canonical・OGP・robotsに切り替わらない。**Productionへのマージ前に環境別設定方式を実装・検証すること。** 現在のCloudflare Pagesビルドコマンドは`npm run css:build && hugo --minify`。Hugoの環境指定とPagesの`CF_PAGES_BRANCH`を用いた切替を実装する場合、Pages側の実ビルド設定との一致まで検証する。SEOの検索登録制御とアクセス制限は別物。
4. **計測**：ProductionホストとGA4測定条件、Cookie同意、重複タグ挿入、Staging非計測を確認する。
5. **公開データ**：`catalog.json`の件数・schema_version・参照・公開対象だけの収録を確認。実データのBackend本番昇格は本作業に含めない。
6. **デプロイ抑止**：Cloudflare Pagesの`main`自動Productionビルド・配信の制御を読み取り専用で確認。マージしても公開されないと推定しない。
7. **明示承認**：PR #13のDraft解除、`main`へのマージ、Productionの公開・DNSの切替はそれぞれ判断を得る。

## 参照

- [Frontend統合Draft PR #13](https://github.com/yurulinkdev/yurulink-frontend/pull/13)
- [現行デプロイ設計](environments.md)
- [公開カタログ仕様](public-catalog-contract-v2.md)
- [Cloudflare Pagesのブランチ別ビルド条件](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Hugoの環境別設定](https://gohugo.io/configuration/introduction/)

## 統合後の確認

- 取り込み用Draft PR #14は`staging`への反映によりmerged。8個のmain固有ファイルは保持し、既存のStaging画面コードは不変。
- `staging`への反映後、既存の本番向けDraft PR #13のmergeable判定が`true`へ変化。ただしDraftのままであり、Productionへのマージ・公開の承認ではない。
- Productionのホスト・SEO設定とデプロイ抑止は本段階では未対応。`main`へ取り込む前の必須ゲートである。

## 進捗チェック

- [x] Google Drive正本 `AGENTS.md`・`Project.md` 読取
- [x] `main` / `staging` SHAと差分監査
- [x] 既存の`main`固有機能の保持方法を決定
- [x] `main`無変更の統合準備ブランチを作成
- [x] 統合準備ブランチCI合格（PR #14、SHA `bf92e5b3`のSmoke Test）
- [x] `staging`に統合コミットをFast-forward反映（SHA `bf92e5b34296863c71c6d8de742ada71b20584ac`）
- [ ] 反映後の同一`staging` SHAでSmoke・Preview・Browserの再検証
- [ ] 環境別Productionビルドの設計・動作検証
- [ ] 最終PRレビュー・本番公開承認
