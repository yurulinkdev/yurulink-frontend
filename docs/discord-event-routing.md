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

## 将来のGoogle Sheets管理
Sheetsを人間用の編集UIとして採用する場合、`order`, `event_code`, `enabled`, `thread_id`, `description` を列として持ち、スキーマ検証・GitHubへのPR反映を経て有効化する。SecretsはSheetへ置かない。
