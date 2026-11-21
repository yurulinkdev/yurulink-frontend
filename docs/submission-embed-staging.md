# Google Formsのサイト内埋め込み：Staging運用手順

更新: 2026-11-21。**Frontend staging限定**。Production/mainへの反映・実フォーム変更・回答データ操作はこの変更の対象外。

## 変更点
- 既存のPCサイドバー／スマホドロワーの「リンクを投稿する」CTAを、サイト内の `/submit/` に遷移させる。
- 投稿ページはGoogleフォームをiframe表示し、Googleフォームを別タブで開く代替リンクも必ず設ける。
- フォーム内のCSS・回答送信を制御せず、Googleへの送信を代理実装しない。
- 原回答は既存のGoogle Forms→Book3に保持し、未承認投稿をFrontend公開JSONへ入れない。
- Hugoパラメータで有効化を制御。スクリプト／HTMLに管理用フォームの編集URLを配置しない。

## URLの関係（本番公開前の必須照合）
- `hugo.toml params.submission.url`: ユーザー指定の短縮回答リンク `https://forms.gle/hgYcATGs2oHEbf9v9`
- `hugo.toml params.submission.embed_url`: Backend `develop/docs/google-forms-first-run.md` に記録されていた**既存Formの回答用URL**。iframeには `?embedded=true` を付ける。
- Google Forms所有者として、**2つのURLが同一のForm ID（`1W7ZMlY4pcQk1zWOL3s47StzndF5OxZG-PzRFS63-mSU`）の回答画面を表示することをブラウザで照合する**。公開URLのレスポンスからForm IDを単純に文字列比較できるとは限らない。
- 本埋め込みのHTMLが有効であることと、実フォームの公開/回答受付/Book3接続/実際の回答記録は**別々に検証**する。Google Drive経由のフォームAPI読取は403で、これらは未確認。
- 同一性未確認の間はStagingでの表示試験のみ。本番のCTAはユーザー判断後に有効化する。

## 画面要件
1. `/submit/` が通常のYuruLinkのサイトナビゲーション・ブランド・テーマを維持する。
2. `iframe` はGoogleフォームの回答画面のみ許可する。編集URL・任意ドメイン・任意スクリプト埋め込みを禁止する。
3. モバイルは縦長スクロール対応。フォームが表示できない場合は外部リンクへ切り替えられる。
4. `noopener noreferrer` をつけ、完了判定はGoogleフォームの画面で行う。
5. 項目は送信しただけで公開されず、SubmissionMasterで確認・審査されることを明示する。
6. Stagingの `noindex` は維持し、Googleフォーム内の投稿内容をAnalyticsに送信しない。

## CI・E2E確認
- Hugo Smoke: `public/submit/index.html`、iframe存在、回答URL、編集用URL不在。
- Playwright: `/submit/`に埋め込みがあり、別タブへの直接リンクも残る。PCとモバイルのCTAからの遷移を確認。
- **Google iframe内部の送信をCIで実行しない。** 実回答が必要なときはユーザー承認済みのテスト投稿だけを使い、フォームの回答数・Book3のタブ/ヘッダー/新しい行・SubmissionMaster重複排除を別途照合する。
- Cloudflare Previewの実SHA、ブラウザテストのRun IDを照合。初回Production/main反映は禁止（別途承認）。

## 将来の運用
- Googleフォームの回答受付停止やカテゴリ選択肢更新は、既存Backend管理経路で実行する。
- Google Formsの応答数や制限、Book3の長期保存/バックアップはBackendの投稿基盤で管理。
- GASによる設問同期の二重実装はしない。Frontendは画面表示だけを担当する。
