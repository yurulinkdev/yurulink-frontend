# Frontendフィードバック No.1（2026-11-20）

対象：Frontend staging / Backend develop。main / Productionの操作なし。

実装範囲：
- トップにお知らせ、説明記事、初回だけのカテゴリ／ドロワー強調を追加。
- 全ページに共通カテゴリを表示。HTMLで最低限の分類リンクを先行表示し、トップではJSで動的メニューに置換。
- リンク集ナビ削除。記事の表示名をhugo.tomlで指定。SNS URLもTOML管理、未登録ならリンクなし。
- サイドバーに最大5件の更新履歴、過去分への記事リンク。
- 時間による検索・ソート。Backendでは既存Book2のISO8601時間を秒へ正規化し、Book4の自動管理項目へ伝搬。
- Xの投稿単体の分類を追加。投稿リンクのデータ投入は別工程。
- GA4は測定IDが空のとき無効。設定した場合もユーザー同意後だけ計測。
- APMは採否を保留し、Cloudflare Web AnalyticsとNew Relic Browserの相違を docs/observability-evaluation.md に記録。

残る判断：YuruLink SNSの実URL、GA4測定IDと運用、Observabilityサービス、X以外のSNS投稿範囲、過去の更新履歴の確定データ。Book2/Book4実データへの再投入とProduction反映は未実施。
