# Frontend 表示・ナビゲーションの回帰防止仕様（2026-11-22）

## 適用範囲と優先順位

- 本書はユーザーの2026-11-22のStaging実画面フィードバックを受けた**確定仕様**。以前の `docs/frontend-feedback-20261120-no2.md` の `/history/` と、2026-11-21 No.4 のサムネイル `object-fit:contain` については、**本書を優先する**。
- 対象：Hugo Extended + Tailwind CSS v4、`yurulinkdev/yurulink-frontend` の `staging`。main/Production、Cloudflare DNS、Google Forms、Backendデータは変更しない。
- 回帰検証：`tests/browser/frontend-ux-regression.spec.mjs` と既存 `feedback-20261120.spec.mjs` / `feedback-20261121.spec.mjs` / `staging.spec.mjs`。視覚検証はGrid/List×PC/モバイルの同一SHA Preview上で行う。CI成功と画面確認は区別する。

## 1. サムネイル（カード・リストの共通契約）

- YouTubeサムネイルのソース候補は `mqdefault`（320×180、16:9）と `hqdefault`（480×360、16:9映像を上下に黒帯でパディングする場合あり）。データ原本のURLから安全なYouTubeホスト上の画像のみ使い、外部の画像生成をしない。
- **表示領域は16:9、余白・帯の露出はなし**。画像を縦横別々に引き伸ばさず `object-fit:cover; object-position:center` でアスペクト比を維持して中央を切り取る。黒帯を含む480×360版も16:9枠に合わせてトリミングする。 `contain` は黒帯を見せてしまうため採用しない。
- カード：画像枠はカード上部いっぱい（`width:100%; aspect-ratio:16/9; padding:0`）、本文が下部に続く。画像とカード枠の間に背景色の帯を作らない。元のアスペクト比は保持する。
- リスト：**PC 168px×94.5px、スマホ（639px以下）128px×72px**。画像は枠内を隙間なく占有。CSSの列幅とHTML `sizes` 指定を一致させる。カード・リストの切替時に `sizes` を再設定（リストは `(max-width: 639px) 128px, 168px`）。`width/height` のHTML寸法比は16:9（320/180）で確保し、レイアウトシフトを避ける。
- プレイリストも共通ルールを適用。実際の公式プレイリスト先頭動画の保証はありません（membershipの順序情報がない場合は公開済み所属動画のサムネイルを代用）。
- SNSプロフィールの丸型アバターは別表示ルール（`object-fit:cover`）を保持する。
- 旧テストが「PC幅125px以下」「`object-fit:contain`」を要求していた場合、旧仕様であり本契約へ更新する。

## 2. サイトヘッダーとトップリンク

- Hugo共通 `layouts/_default/baseof.html` が `layouts/partials/site/header.html` を一度だけ呼ぶ。`/submit/` を含む下層ページのモバイルヘッダーでは、ロゴと `YuruLink` を**一組のみ表示**し、別のYuruLink文字リンクを重複出力しない。PCは左サイドバーのブランドリンクを利用する。
- ロゴ・タイトルをクリックするとトップ `/` に戻り、**選択カテゴリのLocalStorageキー `yurulink-selected-category-v1` を削除**する。既存の表示形式・テーマ・カテゴリグループの開閉状態など無関係なキーは保持する。
- 「すべてのコンテンツ」を選択した場合もカテゴリキーを削除。URLの `category` 指定値は通常の分類選択では優先し、空の `category=` も解除として扱う。ユーザーが意図的に選んだ番組/PLの分類はそれ以外のページへ遷移しても保持する。
- ロゴ／サイト名リンクには `data-reset-category` 属性を付け、共通 `static/js/category-state.js` で同一処理を利用する。Hugo生成の全コンテンツリンクでも空カテゴリをリセットする。

## 3. 更新履歴のURL・月別記事

- **正規URL：`/change-log/`**。従来の `/history/`、`/news/changelog/` は旧仕様として廃止し、HTTP 404を返す（SPAフォールバックの200を許容しない）。
- 月別記事は `content/change-log/YYYY-MM.md` に**1か月につき1ファイル**とし、公開URLは `/change-log/YYYY-MM/`。例えば2027年1月分は `content/change-log/2027-01.md`。
- 日々の公開差分は同月記事へ日付別に追記する。将来の収集・配信の**実際に公開確定した**差分のみ記載し、単なるGitHub Actions成功や開発用Stagingの更新と混同しない。
- 初回Production公開時の記事に限り「本サイトを公開しました。」と記載。公開前は月別記事なしが正しい。
- サイドバー、フッター、最近の更新履歴、共通Hugoナビはすべて `/change-log/` の正本を参照する。

## 4. スマホのカテゴリー・ドロワー

- 1023px以下の画面で、**左端40px以内から右方向64px以上**の明確な水平スワイプで開く。垂直移動が主な操作なら開かず、スクロールを妨げない。
- iOS Safariで `touchend` が失われる場合にも動くよう、明確に水平移動した `touchmove` 時点で開く。 `touchend` も補助判定。CSSの `touch-action:pan-y` と `overscroll-behavior-x:none` を用い、横方向のブラウザ戻る操作との競合を低減する（iOS OSジェスチャーの完全制御を保証するものではない）。
- ドロワー内で左方向へ64px以上スワイプすると閉じる。既存のハンバーガーメニュー、閉じるボタン、Backdrop、Escape、フォーカストラップ、`aria-expanded`、非表示時の`inert`を維持する。
- モバイルではスクロールで消える通常のヘッダーにブランドアイコン＋文字を表示。PCの左サイドバーは常時表示。

## 5. 変更を確定扱いする条件

1. 各対象ファイルをHugoテンプレート／CSS／JSのソースまで確認してから修正する。
2. Playwrightでスマホ・PC、カード・リスト、ホーム・下層ページ（特に `/submit/` と `/change-log/`）、カテゴリ保存・解除、左端スワイプ、旧URL 404を検査する。
3. 同一Frontend stagingコミットSHAについてHugo Smoke、Cloudflare Preview SHA一致、Chromium E2Eの最終結果を確認する。スクリーンショットも必要に応じて見直す。
4. mainマージ、Production公開、DNS変更はユーザーの別途承認を得る。

## SNSアイコンと初回訪問ガイド（2026-11-25）

- サイドバー・フッター・SNSプロフィールカードのプラットフォームSVGには共通の `social-platform-icon` を付ける。ライトは元の黒色、ダークは白色反転とし、サイトの `html[data-theme]` を優先する。OSの設定はテーマ未初期化時の既定値に限る。プロフィール画像は反転しない。
- PC（1024px以上）の初回訪問ではカテゴリ見出しを強調し、直下に「カテゴリから番組や種類を選べます」の吹き出しを表示する。サイドバー内の通常フローに置き、他の項目に重ねない。
- スマホ（1023px以下）はメニューボタンを強調し、ヘッダー内の直下に「メニューはこちら」の吹き出しを表示する。本文を覆わない。
- 初回表示判定には既存の `yurulink-first-visit-hint-v1` を用いる。案内を閉じる、メニューまたはカテゴリを操作する、Escape、表示幅が境界をまたぐ、のいずれかで案内を除去する。
- 回帰テスト：`tests/browser/theme-social-onboarding.spec.mjs`。OSライト・ダークとサイトの明示テーマの組合せ、8種類のSVG、PC・320/390/768pxの表示位置、閉じる操作と再訪時の非表示を検証する。
