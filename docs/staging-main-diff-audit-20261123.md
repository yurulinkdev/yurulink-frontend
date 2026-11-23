# Frontend main・staging 差分監査と同期判定（2026-11-23）

- 状態：確認済みの差分に対する技術判定。将来のコード昇格は別途PR審査・承認を要する。
- 対象：`yurulinkdev/yurulink-frontend`
- 比較時点：2026-11-23（JST）
- 基準SHA：`main` = `2df6ab419082e269af1b423577f38f769f65e61e`、`staging` = `e8e464cd94e8de3f0f73f53ae7206b86cc0e56fa`
- 調査：GitHub Compare APIを両方向で取得し、差異のあるファイルを各ブランチから直接取得して照合した。

## 判定

**現時点でProductionへ追加昇格すべきFrontend機能は確認されなかった。** 2026-11-23のPR [#28](https://github.com/yurulinkdev/yurulink-frontend/pull/28)で、Hugoテンプレート・共通UI・コンテンツの変更は`main`へ統合済み。現在残る実ファイル差分は、環境別デフォルト値とMain側のCloudflare運用資産である。

履歴は分岐している。`main...staging`の比較で、StagingはMainの祖先になっておらず、Staging側に2件、Main側に56件の固有コミットがある。ただし**履歴の差分件数と現在のファイル内容の差分は別の指標**である。GitHubのCompare／Pull Request画面はmerge-base起点の差分（三点比較）を使う場合があるため、ブランチ先端の実ファイル比較には `git diff origin/main origin/staging`（二点比較）を併用する。

確認した公開JSON `data/public/catalog.json` のGit blob SHAは両ブランチとも `014a4352820478924f27f16457ae0634298ea680`。本文は巨大ファイルのためコネクタから全件取得できておらず、**同じblobであることのみ確認**した。`static/js/ga4-consent.js` と `scripts/prepare-site-build.mjs` もblob SHAが一致する。

## ファイル別の判定

| パス | 実内容・差分 | 同期判定 | 具体的な扱い |
| --- | --- | --- | --- |
| `README.md` | CompareではStaging由来の変更として表示されるが、両ブランチの取得本文は一致 | **同期不要** | 既存内容を維持。今後の共通変更は通常PRで更新 |
| `docs/environments.md` | CompareではStaging由来の変更として表示されるが、両ブランチの取得本文は一致 | **同期不要** | データ配信例外と独自ドメインの履歴を維持 |
| `hugo.toml` | `main`: `baseURL=https://www.yurulink.com/`、`noindex=false`、`submission.enabled=false`、`embed_enabled=false`。`staging`: 対応する値が `https://staging.yurulink.com/`、`true`、`true`、`true` | **意図的に分離** | 4つの値を単純コピーしない。デプロイ実際の値は `scripts/prepare-site-build.mjs` と `scripts/verify-site-environments.mjs` で検証 |
| `.github/workflows/cloudflare-inventory-request.yml` | Main側にトークン／DNS読取・旧Pagesプロジェクト確認を追加した差分 | **Mainに維持** | Stagingへコピーする必要はない。Cloudflareトークン分離に合わせて見直す場合は別PR |
| `ops/requests/cloudflare-inventory.json` | `request_id`のみ異なる（Main：`cf-custom-domain-preflight-20261123-01`、Staging：`cf-preview-check-e5e49c6-20261117`） | **同期対象外** | ChatOpsの実行要求ID。ソースコードの差異と扱わない |
| `ops/requests/cloudflare-domains-20261123.json` | Mainのみ。`mode=plan` の一回限りのCustom Domain検査要求 | **Mainに維持・整理候補** | 将来の定常運用で使用するか確認後、不要なら別の保守PRで整理。Stagingへ移さない |
| `scripts/ops/cloudflare-custom-domains-20261123.py` | Mainのみ。2026-11-23のCustom Domain接続で使った固定スコープの操作・検証スクリプト | **Mainに維持・整理候補** | 現行Workflowから参照されているか確認し、必要ならアーカイブまたは削除を別PRで判断。安易に再実行しない |

**判定結果**：追加の機能同期は0件。恒久的な環境分離1件、Main固有の運用資産3件、実行要求の環境固有値1件、双方一致2件。Main固有運用資産にはワークフロー1件、JSON要求1件、スクリプト1件を含む。ここでいう件数は上表の7行を分類したもので、コードの品質評価数ではない。

## 共通化の対象と環境分離の境界

共通化する対象は、Hugoのページ構造、静的アセット、検索・ナビ・アクセシビリティ、共通JS、公開データのスキーマ、回帰テストである。変更の昇格時にはテスト対象SHAとマージ後のデプロイSHAを記録する。

環境別に維持する値は、`baseURL`、canonical、OGP画像、robots `noindex`、投稿フォーム公開可否、GA4計測対象ホスト、Cloudflare PagesのProduction/Previewの対応関係である。Mainの構築時にはProductionの値を出力し、Stagingの構築時にはPreviewの値を出力する。

### Backendからの公開データ配信

Backendの検証済み `data/public/catalog.json` の定期更新は、コードの昇格と別扱いとする。変更ファイルをJSONのみに限定し、既存の自動更新でStagingとMainへ配信する。新しい機能を含むPRへ、過去の `catalog.json` を巻き込まない。更新時にはデータのスキーマと公開対象の検証を実施する。

## 現在の未確認事項・文書整合

- GitHubの `main` 用Ruleset／Branch protectionの**有効化状態、Require status checks、承認数、GitHub Actionsのbypass権限は未取得**。GitHub管理画面で確認してから保護手順を有効化する。
- `Project.md`（Google DriveのネイティブMarkdown正本）には、2026-11-23時点で旧Pagesドメインを正式URLとする記述、旧Staging Pagesプロジェクト未削除、MainのUI未同期など、今回のGitHub実装と一致しない記述が残る。GitHubとCloudflareの確認結果を基に**別作業で正本を更新する**。本書は正本の無断上書きに代わるものではない。
- `docs/environments.md` には「Production初期公開のビルド・受付ゲート」という履歴節がある。現行値の判断は後続の「Custom Domain切替の実施」と実コードを優先する。履歴節を削除するならDev-historyとの整合を別途確認する。
- 設計判定の根拠はソース差分とリポジトリ本文。今回の監査のための新規ProductionデプロイやブラウザE2Eは実施していない。

## 再監査のためのコマンド

実行環境：ローカルPCのGit CLI。リポジトリをclone済み、`origin`に読取権限があること。

```bash
git fetch origin main staging
git log --oneline --left-right origin/main...origin/staging
git diff --name-status origin/main origin/staging
git diff --check origin/main origin/staging
```

差分の詳細を表示する正式なコマンドは次のとおり。

```bash
git diff origin/main origin/staging -- README.md docs/environments.md hugo.toml
git diff origin/main origin/staging -- data/public/catalog.json
```

`git diff origin/main...origin/staging`（merge-baseとの差分）と `git diff origin/main origin/staging`（両先端の内容差分）は、質問を分けて利用する。

## 根拠

- GitHub：`yurulinkdev/yurulink-frontend`、上記2コミットを基準とする双方向Compareとファイル取得（2026-11-23）。
- [Frontend環境・公開ゲート](./environments.md)、[Hugoの環境別ビルド](../scripts/prepare-site-build.mjs)、[Production/Staging生成HTML検査](../scripts/verify-site-environments.mjs)。
- Google Drive正本：`AGENTS.md`（ファイルID `18LMI8AzDmGR83vSecWYRk3OYij5nxjMC`）、`Project.md`（ファイルID `1JP3WYfMBarxcHTjimjYW8330el9msYSD`）。
- 文章規範：[AgentSentenceRule.md v1.3.0](https://drive.google.com/file/d/1GV4vhiy6tk3Bpf1Ta0wu4VbM6Zx3Rmr4/view)（2026-11-23）。
- [GitHub：三点比較と二点比較](https://docs.github.com/en/pull-requests/reference/branches)。

技術的正確性：ソース比較に基づく箇所は合格。ブランチ保護の実際の有効化は未確認。人間の読後評価：未実施。
