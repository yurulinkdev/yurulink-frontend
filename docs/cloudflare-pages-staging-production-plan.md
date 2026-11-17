# Cloudflare Pages Staging / Production 構成移行計画

## 目標
- Pagesプロジェクト `yurulink-frontend` のProduction branchをGitHub `main` にする。
- GitHub `staging` は同じPagesプロジェクトのPreview deploymentとして運用する。
- GitHub ActionsのSmoke Testを通した変更のみ、承認を経て本番にマージする。
- 旧Pagesプロジェクト `yurulink-frontend-staging` は検証・切替が完了するまで維持する。

## 工程と完了条件
1. **現状棚卸し（読み取り専用）**: 両PagesプロジェクトのGit連携、Production branch、ビルドコマンド、出力ディレクトリ、ドメイン、環境変数の有無（値は取得・記録しない）を確認。REST API 8000024を診断。
2. **構成差分と変更手順の確定**: 既存のProduction/Preview URLと公開ドメインへの影響を確認。Cloudflare PagesのPreview設定、ビルド設定、Git連携設定の変更方法を決定。
3. **Staging検証**: `staging` へのpush→Previewビルド→URLでSmoke Test。公開対象データとSecretsが本番に混ざらないことを確認。
4. **Production検証**: 承認済み変更を`main`へマージ→Productionビルド→公開URLとロールバック手順を確認。
5. **旧Staging整理**: 移行後に不要と確定した場合のみ、別途承認を得て停止・削除。

## 安全条件
- 工程1ではCloudflareへの書き込みを行わない。
- DNS、カスタムドメイン、既存プロジェクト、Production branchの変更は現状確認と影響評価後に行う。
- API Token、環境変数値、認証ヘッダー、非公開データをActionsログやArtifactに保存しない。
- Cloudflare APIの詳細取得が失敗した場合は成功扱いにせず、調査ステップの結果を明示する。
- GitHub `main` へのコミットはProduction公開を誘発しうるため、公開設定確認後は運用ルールに沿って変更する。

## 進捗（2026-11-17）
- GitHubの`main`と`staging`ブランチを確認。
- Cloudflare上の2プロジェクト名をWranglerで確認。
- Cloudflare REST APIの一覧取得はHTTP 400、エラーコード8000024。認証・アカウント・エンドポイントの切り分けを実行中。
- GitHub ActionsのFrontend Smoke Testと読み取り専用の棚卸しWorkflowは存在。
- Preview/Productionの対応付けと公開動作は未検証。

## 2026-11-17 診断結果（実測）
- アカウント情報GET: HTTP 403 / Cloudflare error code 9109。Pages関連のGETはHTTP 200で成功したため、Pages操作に必要な権限不足とは断定しない。最小権限を維持する。
- `yurulink-frontend`: GitHub連携、Production branch=`main`、build=`npm run css:build && hugo --minify`、output=`public`。
- `yurulink-frontend-staging`: GitHub連携、Production branch=`staging`、build/outputは同じ。
- 両者の現在のドメインはそれぞれの `.pages.dev`。現状の構成ではStagingは独立したPagesプロジェクトのProduction環境。
- 次に、本番PagesプロジェクトのPreview deploymentに`staging`が存在するかを読み取り専用で検証する。既存プロジェクトの削除やDNS変更は行わない。

## 2026-11-17 Preview実証テスト
- Pages両プロジェクトのデプロイ履歴APIはHTTP 200。取得時点の本番プロジェクト直近20件はすべて`main`のProduction。
- 旧Stagingプロジェクトでは`main`がPreviewとして記録され、Pagesの環境区分は動作している。
- `staging`ブランチに表示影響のないマーカー `ops/requests/staging-preview-smoke-20261117.md` をコミット（`e5e49c6a3502345f38fadb1cbdeb46e05c970164`）。本番プロジェクトのPreviewに同SHAが現れるかを検証する。
- 検証結果を確認するまで、旧Stagingプロジェクトは削除せず、CloudflareのProduction branch設定も変更しない。

## 2026-11-17 Previewデプロイ実証結果と待機方式
- 本番Pagesプロジェクト `yurulink-frontend` のデプロイ `7174987e-036a-4826-b511-81066805e23a` は `environment=preview`, `branch=staging`, `commit_hash=e5e49c6a3502345f38fadb1cbdeb46e05c970164`, `latest_stage=success` を確認。Preview URL: https://7174987e.yurulink-frontend.pages.dev 。単一Pagesプロジェクトによる分離が動作している。
- `scripts/wait-cloudflare-pages.py`: Cloudflare Pagesデプロイ一覧APIを15秒間隔、最大600秒ポーリングし、SHA・ブランチ・環境がすべて一致するデプロイの成功を待つ。タイムアウト・失敗・APIエラーは非ゼロ終了。固定Sleepのみで成功とみなさない。
- `.github/workflows/cloudflare-preview-verify.yml`: `staging`へのPushをトリガーとして、対象コミットのPreview反映を待機。手動実行では任意のフルSHAを指定可能。読み取り専用。
- ブラウザテストは別途失敗しており、Cloudflareデプロイ成功とアプリ機能の合格を区別する。
- 旧Stagingプロジェクトの停止・削除は未実施。切替後のアクセスURL・ブラウザテスト・運用手順の確認を残す。
