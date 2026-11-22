# Frontend Observability設計（2026-11-20更新）

Hugo＋静的配信のサイトとして、ブラウザ側のユーザー体験指標とJavaScriptエラーを計測する。配信先に依存しないテンプレート機能として実装する。

| 手法 | 目的 | 設定と状態 |
| --- | --- | --- |
| Lighthouse / Playwright | Labテスト、LCP/CLS、画面操作の回帰 | Staging CIに継続設置。RUMとは分ける |
| New Relic Browser | 実ユーザーのパフォーマンス、JSエラー、操作トレース | `params.analytics.new_relic_browser_snippet`。空欄は無効 |
| Cloudflare Web Analytics | アクセス・Web Vitals等の軽量計測 | `params.analytics.cloudflare_web_analytics_token`。空欄は無効 |
| GA4 | 利用傾向・訪問者数・イベント分析 | `params.analytics.ga4_measurement_id`。同意後だけ利用 |

## 実装設計

- New RelicとCloudflare Web Analyticsは独立して有効にできる。配信先がCloudflareでも二重計測・スクリプト重複を避けるため、**Cloudflare Pagesの自動ビーコン挿入とHugo手動埋込みは同時に利用しない**。Cloudflareのトークンを使った明示的スクリプトのみをテンプレート側で出す。
- New Relic BrowserはNew Relic管理画面で生成されたブラウザ用Copy/Pasteスニペット全体を設定する。複数行の場合はTOML複数行リテラル文字列（`'''`）を利用できる。管理者が信頼して確認したコードだけを入力する。ブラウザから読めるタグであり、サーバー専用APIキー等の秘密情報を入れない。
- `hugo.IsServer`のときはNew Relic/Cloudflareタグを出力しない。設定が空欄なら両者無効。
- GA4はIDが`G-...`形式のときだけ同意UIを出し、明示許諾後に`gtag.js`をロードする。StagingアクセスをProductionプロパティに混ぜない。
- Cookie同意、アクセスログ、第三者へのデータ転送、プライバシー表示を含む法令・ポリシー整合は、公開前に運営者判断が必要。必要なら全RUMについて同意UI統合を行う（**現状Cloudflare/New Relicは同意UI連携未実装**）。
- CSP採用時はCloudflareビーコン（`static.cloudflareinsights.com`等）とNew Relicの公式指定先を個別に許可する。New Relic inline bootstrapと`unsafe-inline`回避のハッシュ／nonce可否を別途検証する。
- 複数RUMを同時に入れるとCPU、転送量、収集量が増える。性能悪化や個人情報の問題があればサービス単位で無効化できる構成とする。

## 導入時検証

1. StagingでGA4なし／Cloudflareのみ／New Relicのみ／両方のHTMLタグと通信を確認。
2. 重複ビーコンや別環境データ混入がないことを確認。
3. LighthouseとChrome PerformanceのLCP/INP/CLSおよびJSエラーを比較。
4. 公開先の利用規約・プライバシー表示を整備し、必要に応じて同意モデルを見直す。

公式：
- https://developers.cloudflare.com/web-analytics/get-started/
- https://developers.cloudflare.com/pages/how-to/web-analytics/
- https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/
- https://support.google.com/analytics/answer/9304153
