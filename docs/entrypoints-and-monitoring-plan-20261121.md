# YuruLink Frontend：投稿導線・サポート導線・GA4/RUM通知設計（2026-11-21）

状態：**設計資料のみ**。この文書の追加はhugo.toml、テンプレート、Cloudflare設定、Productionを変更しない。

## 前提と実装状態
- Hugo静的サイトをCloudflare Pagesへ配信。Frontend stagingブランチでカテゴリナビ、スマホドロワー、記事/更新履歴、ブランド資産を開発中。
- `hugo.toml`に `params.social.x=https://x.com/YuruLinkDev`、`params.analytics.ga4_measurement_id=G-8Y659Y3Y8Y` が設定済み。`ga4_hostnames=["www.yurulink.com"]` によりStagingは本番GA4を計測しない。GA4は明示同意後の読み込み設計。本番計測は未検証。
- `params.analytics.cloudflare_web_analytics_token` と `params.analytics.new_relic_browser_snippet` は空欄なら無効。RUMの本番動作・同意・CSP・二重ビーコンは未検証。詳細は `docs/observability-evaluation.md`。

## Google Form専用CTA（提案）
- 一般のSNSリンクとは分離し、PCサイドバーとモバイルドロワーの認識しやすい場所へ「リンクを投稿する」の独立リンクを設置。フォームの**回答者用**URLを使用し、Google Formの編集用URLを掲載しない。
- 個別リンク推薦と「サイトの不具合報告」（Discordサポート）は別窓口。フォーム回答を直接Book4へ公開せずBook3→SubmissionMaster.pendingで審査する。
- TOMLで外部設定。テンプレート改修なしに受付停止とURL差し替えができる。SSGなのでTOML変更後の再ビルドは必要。

```toml
[params.links]
submission_form_url = ""
support_discord_url = ""
[params.submission]
enabled = false
label = "リンクを投稿する"
description = "掲載候補をお寄せください"
```

- 無効／空URLなら出力しない。外部リンクは安全なHTTPSと適切なrel/target属性を用いる。ドロワー/キーボード操作、スマホ表示、外部フォームへの遷移をStagingで検証。
- 現時点では実回答用URL・Discord招待URLは未登録。新規Google Formの受付とBook3回答先接続・公開受付状態はBackend側で検証が必要。

## Frontend観測・通知（提案）
- **GA4**：ユーザー行動、検索利用、フォーム遷移など。数値のGA4 Property IDとData APIのGoogle Cloud認証を整備し、週1回Discordの「利用統計」へ集約。測定IDだけではData APIを実行できない。
- **Cloudflare Web Analytics/RUM**：アクセス・実ユーザーのLCP/INP/CLSなど。Cloudflareの利用可能APIと週次通知を確認し、必要な項目を週1回Discordへ。自動/手動ビーコンの二重挿入を禁止。
- **New Relic Synthetics**：サイト外から本番URL、主要ページ、公開JSONを監視。常時HTTP監視と必要最小限のScripted checksを組み合わせ、監視レポートは「監視」フォーラムへ異常/復旧時のみ送る。GA4/RUMビーコンの欠測のみでサイトダウンを判定しない。
- Staging/Productionデプロイ通知はCloudflareのデプロイ事実だけでなくSHA一致とブラウザ検証結果を区別し、発火時にはcommit/run_urlを付与する。Backend Blue/Greenのどちらが供給源かは別属性とする。
- 「サイトが落ちた」場合、サイト自体から通知できないので外部監視＋Discord公開稼働状況（将来独立ステータスページ）を利用する。

## Discord接続前提
- 新サポートDiscordサーバーはユーザーが作成済み。一般閲覧は「メンバー」ロール付与後。3つの通知フォーラム「開発・運用」「利用統計」「監視」はメンバーが閲覧可能な構成。新Forum/Thread IDとWebhookは未設定。
- Contributor向けの一括投稿とBook0の対象追加申請はAutomation LabのDiscordアプリ/Bot案または専用repoで設計。Frontendから直接Google Sheetsの管理権限を付与しない。
- Notification/Member向け表示に内部ログ・個人情報・投稿原本・Secretsを出さない。
- 関連: [Backend統合設計](https://github.com/yurulinkdev/yurulink-backend/blob/develop/docs/support-discord-observability-architecture.md)

## 変更境界
設計資料のみ。Hugo実装、Webhook発火、New Relic監視の作成、GA4 Data API接続、DNS、Production/mainマージをこの変更では実施していない。


## 2026-11-21 文書整合監査

- GA4測定ID`G-8Y659Y3Y8Y`は取得・hugo.toml登録済。ただし本番計測は未検証。Cloudflare Web Analytics先行導入とNew Relic追加はまだ検討段階。各トークン未設定。
- Discordの新サーバーに移行したWebhook/Forum/thread IDは未確認。旧サーバーの6スレッド送信テストと混同しない。Frontend mainのルーティングDraft PR #10は旧サーバーIDのため、新サポートDiscordへそのままマージしない。
- ChatOpsは`staging`の`ops/requests/frontend-validation.json` → `frontend-validation-request.yml`で直接実行し、通常のコードPush CIを維持する。2026-11-21のSmoke/Preview成功とBrowser 3件失敗は別々に記録。将来の通知40/50はこれらの確定した結果とrun SHAを紐付ける。
- ドメイン購入方法・期間は保留。Registrar決済、DNS、外部通知、New Relic、Productionは本設計資料の編集では変更しない。
