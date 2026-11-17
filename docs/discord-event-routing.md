# Discordイベント通知設計（初期版）

## 管理方針
- イベントコードは安定した識別子。コード変更は通知連携への破壊的変更として扱う。
- `ops/notifications/routes.json` の `events.<code>.thread_id` に通知先DiscordスレッドIDを指定する。IDは公開可能な識別子だが、運用上必要な範囲に共有を限定する。
- WebhookのURLはGitHub Repository Secretsの `DISCORD_WEBHOOK_URL` に設定する。Gitに記録しない。
- 通知先を未設定（`null`）にした場合は通知をスキップする。無効化は `enabled: false`。
- 送信側は `YURULINK_EVENT_CODE` と `YURULINK_EVENT_STATUS` を指定して `node ops/notifications/notify-discord.js` を実行する。
- Discord通知失敗は主処理の成否を変更しない（Actions側で `continue-on-error: true`）。
- 通知本文には投稿者の個人情報、フォーム回答本文、認証情報を含めない。
- 再実行時は同じイベントが再通知されうる。将来は event_id による重複排除を追加する。

## イベントカタログ
| コード | 発生条件（将来設計含む） | 状態 |
| --- | --- | --- |
| `ops.cloudflare.inventory.completed` | Cloudflare Pages棚卸しジョブの終了（成功・失敗） | Actionsに接続済み。通知先ID・Webhook未設定なら送信なし |
| `forms.submission.received` | Google Form回答を取り込み、投稿IDを確定したとき | 未接続 |
| `catalog.content.published` | 公開対象コンテンツの追加を検出し公開完了したとき | 未接続 |
| `deploy.staging.completed` | Stagingデプロイ結果が確定したとき | 未接続 |
| `deploy.production.completed` | 本番デプロイ結果が確定したとき | 未接続 |

## フォーム通知の注意
Google Formの回答が送信された瞬間と、Backendが回答を検出・検証・取り込んだ瞬間は異なる。
初期実装では後者をイベント発生点とし、回答IDで重複検出する。Google Apps Scriptのフォーム送信トリガーで即時通知する場合は別イベントを定義する。

## 将来のGoogle Sheets管理
Sheetsを人間用の編集UIとして採用する場合、`event_code`, `enabled`, `thread_id`, `description` を列として持ち、スキーマ検証・GitHubへのPR反映を経て有効化する。SecretsはSheetへ置かない。
