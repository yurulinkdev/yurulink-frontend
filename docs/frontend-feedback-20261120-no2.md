# Frontendフィードバック No.2（2026-11-20）

実装先：Frontend `staging`、分類定義はBackend `develop` とFrontend複製。main / Productionへの反映・Book3原本の書換え・Google Formの本番変更は行わない。

## 確定した仕様

- YuruLink運営用Xは`https://x.com/YuruLinkDev`。出演者・番組アカウントとの混同を禁止し、`hugo.toml` の`params.social.x`のみを管理する。
- GA4は任意機能。`params.analytics.ga4_measurement_id`が空のとき不使用。設定時は既存の同意UIで承認された場合だけロードする。Production/Stagingは測定対象を分離する。
- New Relic BrowserとCloudflare Web Analyticsは任意・独立。`hugo.toml`の`params.analytics.new_relic_browser_snippet`と`cloudflare_web_analytics_token`へ値を設定し、配信事業者の自動挿入に依存しない。Cloudflare側の自動挿入と二重に入れない。タグの性能・CSP・個人情報を検証する。
- Google Formsなどの審査対象投稿にInstagramの公開投稿とリールを追加。Instagram API自動収集や自動スクレイピングは採用しない。noteの記事単体とシリーズ／マガジンも対象にする。シリーズは現行公開データでは`kind=article` + `category_id=note_series` + `platform=note`とし、必要に応じてCollectionと関連付ける。投稿・シリーズの分類はBackend `config/taxonomy.v1.json`が正本。
- `/news/welcome/`は廃止。`/about/`を独立のサイト紹介ページとする。記事とお知らせは`/about/<slug>/`に統合し、モバイルのホーム先頭では「おしらせ」枠を表示しない。検索ガイドは`/help/search-guide/`、Help一覧は`/help/`。
- 更新履歴は`/history/`および月別`/history/history-YYYY-MM/`。本文を日ごとに追記し、1か月1ページに集約する。月ごとのHugoタイトルも`history-YYYY-MM`。本公開前は履歴なし。初回公開時「本サイトを公開しました。」と記載し、その後は12時間同期等の実際の公開差分を日単位にまとめる。同期実行の成功と公開確定を混同しない。
- 再生時間`duration_seconds < 300`のYouTube動画はサイト内の`ショート`に分類。300秒は通常判定の対象。これはYouTubeの正式なShortsフラグと異なる。Backendの`video_format_source=manual_verified`は改変しない。`動画`サブカテゴリと種類の`動画`フィルタから除外、`ショート`へ統合。再生時間フィルタUIとURL`duration`は削除する（再生時間ソートは残す）。
- `hugo.toml`のコメントはYuruLinkの開発日誌でなく、利用者向けの再利用可能なテンプレート設定説明とする。
- 最新画像・制作ツールキットはGoogle Driveの`YuruLink_Assets`へ配置し、README・マニフェスト・更新規則も同期する。原本／生成画像／下書きを区別する。

## 実装済み・未完了の境界

Frontend staging：ルーティングとナビ、動画表示形式、フィルタ、Config、SNS・noteカテゴリ表示の受け皿、回帰テストを更新。Productionには未反映。現在`/history/history-YYYY-MM/`の実データは存在しないことが正しい。

Backend develop：Google Forms等の分類定義JSONにInstagramおよびnoteカテゴリを追加。**既存Google Formの選択肢変更・本番Book3回答先更新・SubmissionMasterとBook4への実リンク反映は未実施。** 既存投稿審査と公式性を維持する。

CSVでの一括投稿は`yurulink-backend/docs/bulk-submission-import-design.md`を参照。Book3原本にForms回答を偽装挿入しない。
