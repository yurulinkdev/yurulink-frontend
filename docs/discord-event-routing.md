# Discordイベント通知設計（初期版）

## 管理方針
- イベントコードは安定した識別子。コード変更は通知連携への破壊的変更として扱う。
- 表示順はイベントごとの数値 `order` で管理する（10刻み、昇順）。イベントコードの辞書順や発生時刻とは独立する。実際のイベントの時系列は発生日時で管理する。
- `ops/notifications/routes.json` の `events.<code>.thread_id` に通知先DiscordスレッドIDを指定する。IDは公開可能な識別子だが、運用上必要な範囲に共有を限定する。
- WebhookのURLはGitHub Repository Secretsの `DISCORD_WEBHOOK_URL` に設定する。Gitに記録しない。
- 通知先を未設定（`null`）にした場合は通知をスキップする。無効化は `enabled: false`。
- 送信側は `YURULINK_EVENT_CODE` と `YURULINK_EVENT_STATUS` を指定して `node ops/notifications/notify-discord.js` を実行する。
- Discord通知失敗は主処理の成否を変更しない（Actions側で `continue-on-error: true`）。
- 通知本文には投稿者の個人情報、フォーム回答本文、認証情報を含めない。
- 再実行時は同じイベントが再通知されうる。将来は event_id による重複排除を追加する。

## イベントカタログ（order順）
| order | コード | 発生条件 | 状態 |
| ---: | --- | --- | --- |
| 10 | `forms.submission.received` | Google Formの回答送信を検知したとき | 未接続 |
| 20 | `forms.submission.imported` | Backendが回答の取り込み結果を確定したとき | 未接続 |
| 30 | `catalog.content.published` | 新規ページ・コンテンツ公開を確認したとき | 未接続 |
| 40 | `deploy.staging.completed` | Stagingデプロイ結果が確定したとき | 未接続 |
| 50 | `deploy.production.completed` | 本番デプロイ結果が確定したとき | 未接続 |
| 90 | `ops.cloudflare.inventory.completed` | Cloudflare Pages棚卸し終了 | Actionsに接続済み。通知先未設定なら送信なし |

※ この順序は運用上の表示順であり、必ずしもイベントの実際の発生順を保証しない。特に公開イベントとデプロイイベントの因果関係は公開処理の実装時に確定する。

## フォーム通知の注意
Google Formの回答が送信された瞬間と、Backendが回答を検出・検証・取り込んだ瞬間は異なる。
両方を独立したイベントとして扱う。受付通知はGoogle Apps Scriptのフォーム送信トリガーなどで送信時に発火させ、取込通知はBackendが回答IDに基づき取り込み結果を確定した際に発火させる。両者は共通の投稿識別子で紐づけ、重複通知を防ぐ。Webhookは送信主体ごとにSecrets/Script Propertiesなど安全な保管先に置く。

## スレッドID割当（2026-11-20、設定案）

Discordの `sys-notify-システム通知` フォーラムでユーザーが作成した既存スレッドに割り当てる。スレッドIDは機密トークンではない。Webhook URLはGitHub Secretsにのみ保管する。

| order | event | thread_id | enabled / 現時点の動作 |
| ---: | --- | --- | --- |
| 10 | forms.submission.received | 1573138878238560438 | false: Google Forms送信トリガーとの接続は未実施 |
| 20 | forms.submission.imported | 1573138950279667832 | true: Backend developのBook3→SubmissionMaster通知に接続。実運用は未有効 |
| 30 | catalog.content.published | 1573139410734682272 | false: 検証済み公開イベント発火の接続待ち |
| 40 | deploy.staging.completed | 1573139480251211908 | false: Cloudflareデプロイ確定イベント接続待ち |
| 50 | deploy.production.completed | 1573139590741491882 | false: 本番デプロイイベント接続待ち |
| 90 | ops.cloudflare.inventory.completed | 1573139736468529232 | true: mainの棚卸しActionsに通知処理あり。ルーティング変更はPRマージ後に有効 |

`forms.submission.received` と `forms.submission.imported` は異なる。Google Form受付時の即時通知は、Forms側の送信トリガー（例: Apps Script）とその権限設定が完成するまで有効化しない。20は既存Book3原本の取り込み時に通知するもので、フォーム送信時のリアルタイム通知ではない。

### 審査待ち通知とメンション

- **10：受付** メンションしない。送信内容の原本や投稿者個人情報をDiscordへ転記しない。
- **20：審査が必要な投稿** Backendの30分間隔の集約取込時、`pending.notified_at` が未設定の行がある場合のみまとめて送信。通知成功後に `notified_at` を記録する。新規未通知ゼロ件なら送信しない。
- 既定の `allowed_mentions.parse=[]` を維持し、`@everyone`・`@here`・無関係なロールの通知を抑止する。
- メンションを有効化する場合のみ、BackendのRepository Variables `DISCORD_REVIEW_MENTION_ENABLED=true` と `DISCORD_REVIEW_ROLE_ID=<許可するロールID>` を設定する。送信先は20のスレッドのみ。指定ロール以外を許可しない。
- メンションロールの作成・範囲・通知頻度はユーザーの追加判断を待ち、現時点では既定無効。
- 当面は追加の未対応リマインダー通知を実装しない。24時間の自動承認は設計上のルールであり、Book4公開までの実運用は未完成。

Backendワークフロー: [ingest-book3.yml (develop)](https://github.com/yurulinkdev/yurulink-backend/blob/develop/.github/workflows/ingest-book3.yml)

**注意**：本ルーティング設定はFrontend `main` を基点とした作業ブランチでの変更。レビュー・CI後、mainへのマージは別途承認が必要。現在の `staging` にはこの通知ルーターの実体はまだ含まれていない。

### 初回スレッド送信テスト（2026-11-20）

- [GitHub Actions run 44661590694](https://github.com/yurulinkdev/yurulink-frontend/actions/runs/44661590694) は **success**。WebhookはFrontendリポジトリの `DISCORD_WEBHOOK_URL` Secretから取得。
- 10/20/30/40/50/90の6スレッドに「通知経路テスト（本番イベントではありません）」を1件ずつ送信し、Discordのレスポンスの `channel_id` が設定スレッドIDと一致したことを確認。**6/6成功**。
- 全メッセージ `allowed_mentions.parse=[]`。メンションなし。実フォーム・SubmissionMaster・公開処理は一切起動していない。
- この結果はWebhook配送とスレッド振り分けの検証であり、各イベントの実際の発火・実データのE2E・BackendのSecret登録・メンション機能の運用確認を意味しない。
- テスト用ワークフローは `discord-thread-smoke.yml`。ブランチへの通常のpushでは再送されないようワークフローファイル変更のみをpushトリガーとする。手動再実行は明示的に行う。

## 将来のGoogle Sheets管理
Sheetsを人間用の編集UIとして採用する場合、`order`, `event_code`, `enabled`, `thread_id`, `description` を列として持ち、スキーマ検証・GitHubへのPR反映を経て有効化する。SecretsはSheetへ置かない。
