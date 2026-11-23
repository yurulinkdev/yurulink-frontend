# Frontendのカテゴリ構造・初期表示性能

YuruLinkのFrontendは、トップページの案内とリンク検索を別ページに分ける。カテゴリの表示構造はBackendの分類定義を基準とし、一覧画面では表示する件数に応じてDOMを更新する。

対象は`yurulink-frontend`の`staging`。Productionへの公開、`main`へのマージ、DNS変更、BackendのBlue／Green切替は別の承認対象とする。

## カテゴリの表示構造

```text
すべてのコンテンツ
YouTube動画
├─ 公式チャンネル
├─ コラボ・公認・関連
└─ その他
その他サイト・SNS
├─ Webサイト
│  ├─ 公式・公認
│  └─ 非公式
└─ SNS
   ├─ 公式/関係者
   └─ その他
```

- 上記の階層は、Backendの`config/taxonomy.v1.json`にある`navigation`を基準とし、Frontendの`data/taxonomy.json`と整合させる。
- YouTubeチャンネルの表示分類はShared Book1の`channel_groups`から取得する。`channel_group=official|related|other`はナビゲーションの配置先であり、個別の公式性確認結果とは別に扱う。
- チャンネルには動画・プレイリスト・ショート・ライブの導線を置き、必要に応じて所属プレイリストを階層表示する。
- カテゴリを選ぶと`/catalog/`に移動し、検索・種類フィルタと組み合わせて表示する。ロゴで`/`に戻った場合、または「すべてのコンテンツ」を選んだ場合はカテゴリ選択を解除する。
- カードやメニューの名前に、確認していない「公式」「公認」などの判定を追加しない。固定されたカテゴリ名はそのまま使用する。

## ページ別の読み込み

| ページ | 主な内容 | カタログの読み込み |
| --- | --- | --- |
| `/` | 「ようこそ」の案内 | 全件カードHTMLは読み込まない |
| `/welcome/` | 同じ案内を表示する補助ページ | 全件カードHTMLは読み込まない |
| `/catalog/` | 検索、カテゴリ・種類フィルタ、ソート、ページ送り | `/catalog-data/`から一覧HTMLを非同期取得 |
| `/catalog-data/` | Hugoが生成する全件リンク一覧。JavaScript無効時の参照にも利用 | 一覧HTMLを直接表示 |

`static/js/site.js`は取得した一覧HTMLを`template`内に保持し、通常の表示領域へ追加するカードを1ページ分に限定する。標準は20件で、表示件数の切替により50件または100件となる。画像の`sizes`調整や動画メタデータの表示処理も、表示対象カードに適用する。

2026-11-22時点の診断記録には「初期応答に数千件のカードHTMLを含む」とあるが、現行構成では`/catalog/`の初期応答と`/catalog-data/`の取得が分離されている。**転送量・初期表示時間の実測値は、この構成ごとに取得する。** 検索索引の分割やJSONによる軽量化は、追加の改善候補である。

## 動作・性能の確認

- `scripts/smoke-test.sh`でHugo生成、主要ページ、404などを確認する。
- `tests/browser/category-performance-20261122.spec.mjs`でカテゴリ構造、表示ラベル、表示件数、フィルタを検証する。
- `tests/browser/staging.spec.mjs`、`feedback-20261120.spec.mjs`、`feedback-20261121.spec.mjs`、`frontend-ux-regression.spec.mjs`で既存の検索・遷移・操作を確認する。
- 同じコミットSHAでSmoke、Cloudflare PreviewのデプロイSHA、Playwright Chromiumの結果を照合する。実機の体感速度はCIとは別に評価する。

関連：[初期表示とURLの境界](frontend-initial-render-performance-20261123.md)／[UI回帰仕様](frontend-ui-regression-contract-20261122.md)。
