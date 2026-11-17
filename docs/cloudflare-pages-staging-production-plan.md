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
