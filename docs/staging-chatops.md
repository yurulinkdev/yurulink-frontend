# Frontend Staging ChatOps：直接実行方式

更新：2026-11-21。対象ブランチ：`staging`。本ドキュメントは**Staging用**で、`main`／Production、DNS、Backend Green/Blue の切替を行わない。

## 目的と責務
- `staging` を常用の開発経路として維持し、ChatGPTのGitHub連携から**特定JSONのPushだけ**で検証処理を起動する。
- Backend `develop`の `backend-validation-request.yml` と同じ **Push→JSON許可リスト検証→同じWorkflow内のJobで実行** を採用。
- 既存の自動Smoke／Cloudflare Preview SHA検証／Playwright Browser検証はコードPushとPRに対して維持。手動`workflow_dispatch`も削除しない。
- 起動用Workflowが別のWorkflowを`gh workflow run`などでDispatchする方式は採用しない。
- GitHub ActionsからCloudflare Previewを**読み取り専用**で確認する。配信、Cloudflare設定変更、Production昇格は許可しない。

## エントリポイント
- リクエスト：`ops/requests/frontend-validation.json`
- Runner Workflow：`.github/workflows/frontend-validation-request.yml`
- 実行イベント：`staging`への上記JSONのPush（`on.push.paths`）。
- 新規実装のRunner：`ubuntu-latest`（GitHub-hosted）。**Self-hosted Runnerは未使用**。
- 他の3つの既存Workflowは **このJSONだけが変更されたPushを除外**し、検証重複を抑える。コードとJSONを同時Pushした場合は、従来のコード用検証も起動する。
- Cloudflare Pages側のGit連携がリクエストのみのCommitをビルド対象とするかは別設定で、この変更では制御しない。

## JSONスキーマ（全フィールド必須・追加キー禁止）
```json
{
  "schema_version": 1,
  "action": "smoke_staging_readonly",
  "environment": "staging",
  "request_id": "smoke-20261121-001",
  "target_sha": "84235b95d21156ebde41a52c75030bb7589b7475"
}
```

- `schema_version`：数値の`1`。
- `environment`：`staging`固定。
- `request_id`：ASCII英数字・`_`・`-`、1〜64文字。要求ごとに新しい値。
- `target_sha`：小文字40文字の完全なGit Commit SHA。**要求ファイルのCommitとは別に、検証対象のコードCommitを指定**する。要求Push時点の`staging`の祖先であることを`git merge-base --is-ancestor`で検証する。
- `action`：次の4種類以外は拒否。

| action | 実行内容 | 変更先 |
| --- | --- | --- |
| `smoke_staging_readonly` | 指定SHAをCheckoutし、従来のHugo Smoke Test | Runner内部の一時ファイルのみ |
| `preview_staging_readonly` | Cloudflare Pagesの`staging` Previewについて、指定SHAのデプロイ成功を照合 | なし |
| `browser_staging_readonly` | 指定SHAのPreview URLを取得し、そのSHAのPlaywrightテストをChromiumで実行 | Artifactsのみ |
| `full_staging_readonly` | Smoke→Preview確認→Browserの順で検証 | Artifactsのみ |

`target_sha`は、ChatGPTが対象ブランチの現行SHAを実際に読み取って記入する。リクエストJSONのPushでブランチのHEADが変わっても、**対象の検証コードとCloudflareデプロイSHAがずれない**ようにする。

## チャットからの作業手順
1. 必ずGitHubで`staging`の現在SHA・Workflow・JSONを読み直す。
2. `target_sha`に検証したいコードCommitの40文字SHAを設定し、`action`を4つの列挙から選ぶ。
3. `request_id`を変更し、`staging`上のJSONだけCommit／Pushする。不要なWorkflow変更や任意Shellコマンドの埋め込みをしない。
4. `Frontend staging ChatOps request (read only)`のRunを探し、**要求PushのCommit SHA、対象SHA、request_id、Job成功／失敗を照合**する。
5. Browserの場合、対象Runの`chatops-browser-<request_id>` Artifactsを確認する。Browserが既存の失敗と同じ原因でも、成功したとは報告しない。
6. 結果を「Push済み」「Workflow起動」「GitHub Job成功」「Cloudflareデプロイ成功」「ブラウザ検証成功」に分けて報告。どれか未確認なら未確認とする。

## 既存フローの保存
- `.github/workflows/frontend-smoke.yml`：通常の`staging`／`main` PushとPR時のSmoke継続。
- `.github/workflows/cloudflare-preview-verify.yml`：通常の`staging` Pushで指定SHAのPreview確認継続。
- `.github/workflows/staging-browser.yml`：通常の`staging` PushでPlaywright E2E継続。
- 旧独立PagesとPreviewの比較Workflow・スクリプトは移行済みのため廃止。比較対象の旧URLにはアクセスせず、現行Pagesプロジェクトの同一SHA Previewを直接検証する。

## 導入前のベースライン（2026-11-21）
- コミット：`84235b95d21156ebde41a52c75030bb7589b7475`。
- Smoke Run [44843042315](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44843042315)：成功。
- Cloudflare Preview Run [44843042264](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44843042264)：成功。
- Browser Run [44843042255](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44843042255)：**3テスト失敗**。カテゴリー関連の既存アサーション失敗。今回のChatOps導入で新たに発生したものではない。
- **リクエスト専用Workflowの起動成功と、導入後のBrowser結果は別途Runで確認する**。既存失敗を隠して「全CI成功」とは扱わない。

## 導入後の実測更新（2026-11-21）

- PR [#11](https://github.com/yurulinkdev/yurulink-frontend/pull/11)を`staging`へSquashマージ済み。対象SHA `47f58aa12948c9a9249db15ae654451e2417b0e2`。
- JSON専用Push → 同一Workflowでの`smoke_staging_readonly`：Actions [Run 44856007489](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44856007489) **成功**。
- 通常のコードPushでのSmoke [44856007457](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44856007457) **成功**、Cloudflare Preview [44856007462](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44856007462) **成功**。Browser [44856007491](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44856007491)は**3 failed・1 flaky・34 passed**。ログで非展開リンクを可視と期待するAboutテスト、チャンネル/プレイリスト複数所属テストのクリックタイムアウト、プレイリスト見出しクリック後のURL不一致を確認。カテゴリ選択維持テストは初回失敗・リトライ成功。実際のUI不具合とテストの期待値ずれを切り分けて修正する。
- `preview_staging_readonly`、`browser_staging_readonly`、`full_staging_readonly`のJSON要求からの実成功は、この確認だけでは保証できない。Smoke成功を全アクション成功に拡張しない。
- 通常3Workflowは専用JSON**のみ**変更したPushを除外するが、リクエストとコードを混在させると通常CIも起動する。Cloudflare PagesのGit自動デプロイを`paths-ignore`で抑制できるとは限らない。

## リスクと制御
- JSONは任意のScript、引数、URL、Runner名を受け付けない。実行処理はWorkflow側で固定する。
- `target_sha`は厳密に検証した`staging`祖先のCommitのみ。実行内容も対象SHAのRepositoryに由来するため、Workflow/ブランチへの書込み権限は強い権限と考え、保護を維持する。
- SecretはCloudflareを読むStepだけに渡す。GitHub Tokenは`contents: read`。
- 高権限なProxmox Self-hosted Runnerを、PublicなFrontendリポジトリの検証Workflowへ直接接続しない。内部操作はPrivateな運用Repoに独立した許可リスト・承認ゲートを設ける。
- `workflow_dispatch`の旧Workflowは、手動／調査用途として残す。別Workflowへの直接起動が復活したと誤認しない。

## Skill
共通知識はYuruLink Automation Labの `.agents/skills/github-actions-chatops/SKILL.md` に記録。具体的なFront/Backの実装状況は各ブランチの実ファイルで再確認すること。
