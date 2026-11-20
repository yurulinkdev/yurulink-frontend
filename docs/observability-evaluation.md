# Frontend Observability検討（2026-11-20）

YuruLinkはHugo＋Cloudflare Pagesの静的配信。現段階でサーバーAPMを導入してもサイト描画遅延を直接観測できない。ブラウザRUMとラボ計測を区別する。

| 手法 | 対象 | 方針 |
| --- | --- | --- |
| Lighthouse / Playwright | ラボのLCP/CLS、表示・操作の回帰 | 既存CIを使って初回カテゴリ表示とトップ／記事の計測を継続 |
| Cloudflare Web Analytics | 実ユーザー閲覧・Web Vitals | 第一候補。Pagesの管理画面で有効化するかは管理者判断 |
| New Relic Browser | JavaScriptエラー、Web Vitals、ブラウザ操作 | 遅延原因の解析が必要な場合の次段階。エージェントの費用・プライバシー・CSPを検討 |
| Google Analytics 4 | アクセス動向・利用分析 | TOML設定・同意制御を用意。APMとは別用途 |

hugo.toml の params.analytics.ga4_measurement_id にG-...を指定すると全ページに同意UIを表示。同意後だけgtag.jsを読み込み、未設定・不同意では外部通信しない。実測の確認はGA4の管理画面で別途行う。

現行の最大ボトルネック候補は3,000件超のDOMを初回に配置し、JavaScriptで分類ナビゲーションを組み立てること。カテゴリー名をビルド時に先行表示する改善に加え、将来的には分割JSONや検索インデックス、必要件数のみのDOM表示を評価する。

一次資料：
- https://developers.cloudflare.com/pages/how-to/web-analytics/
- https://docs.newrelic.com/docs/browser/browser-monitoring/installation/install-browser-monitoring-agent/
- https://developers.google.com/tag-platform/security/guides/consent
