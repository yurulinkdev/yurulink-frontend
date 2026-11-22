# Frontendの性能・カテゴリ構造契約（2026-11-22）

## 対象／公開境界
- 適用先は `yurulink-frontend` の `staging` のみ。Backendは `develop`、Shared Book1で表示分類を編集する。
- 本番切替、Frontend/Backend `main` マージ、Cloudflare DNS更新、Blue/Greenアクティブ切替は、Staging検証結果を提示してから個別承認を得る。
- 本文は当日ユーザー指示による新しい確定ナビ仕様。既存の2026-11-20/21の階層・公式性表示と矛盾する点は本書を優先する。

## 表示カテゴリ（表示文言の正本）
カテゴリー選択なしの「すべてのコンテンツ」を最上部、独立した項目として配置する。トップレベルは厳密に次の2つ。

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

- 表示ラベル・UIの分類IDの正本はBackend `config/taxonomy.v1.json` の `navigation`、Frontend `data/taxonomy.json` は同一内容のコピー。Hugoの `category-navigation.html` が `navigation` を参照する。コピー間の整合をCIで検査すること。
- YouTubeの3分類はShared Book1 `channel_groups` を人が選択する**表示上の配置先**で、`channel_group=official|related|other` として公開 `catalog.programs[]` に投影される。収集対象チャンネルであっても、未選択なら `other` に仮配置する。
- 上記の「公式チャンネル」という名称、Book1の選択結果、動画の所属経路は、権利者・番組・公認性を独立に検証したという証明にならない。公開の `officiality_verified` を自動的に真にしない。
- ナビ中の個々のチャンネル名やリンク名に `（公式）`、`（未確認）`、`（非公式）` といった公式性判定のサフィックスを追加しない。ただしユーザー指定の**固定カテゴリ名そのもの**にある「公式」「公認」等は仕様として維持。
- チャンネルの内側の動画／プレイリスト／ショート／ライブ、プレイリスト所属先は保持。登録外の動画を誤って公式チャンネルに昇格しない。
- 保存したカテゴリのURLとLocalStorage復元、「すべてのコンテンツ」またはブランドロゴでの解除、種類フィルタ、検索、ソート、カード／リスト表示、月別更新履歴、スマホのドロワー操作は引き続き回帰必須。

## 診断で確認した初期表示のコストと改善
| 箇所 | 以前の動作 | 改修した動作 | 課題 |
|---|---|---|---|
| HugoカテゴリHTML | チャンネル×PLをネスト探索、ページごとに構築 | ID／正規化名の対応マップによる1パス構築、`partialCached`をホーム／下層ごとに利用 | チャンネル名とPLの一意性 |
| DOMの動画メタ整形 | 公開カタログ約3,600件へ4つ以上の同期ループ | 初期20件、表示設定で最大100件のみを遅延整形・再整形回避 | 未表示要素は整形前のテキストが残る（正しい動作） |
| カード画像 `sizes` | ビュー切替時に3,600件以上の画像要素を走査 | 可視ページの画像要素だけ更新 | PC168px／スマホ128pxのリスト幅に同期 |
| CSSカード | リストの `:has(> .catalog-media)` 判定 | `:first-child` でメディア不在を処理。画面外要素は `content-visibility:auto` | Browser実測で描画・高さジャンプを確認 |
| GitHub Smoke | 同ブランチで連続push時も実行を重ねる | 最新push優先のconcurrency、過去runキャンセル | Preview SHA一致・Browser E2Eの独立ゲートは維持 |

**重要：** Hugoはなお3,600件以上のカードHTMLを初期応答に含める。以上はHugoテンプレート・JavaScript処理・画面外描画の軽量化であり、転送量／DOMパース数を根本的には減らしていない。将来の最優先改善候補は「静的検索索引とJSON／HTML分割・可視ページだけのカード生成」。その場合は日本語検索、URL共有、カテゴリ絞り込み、遷移、アクセシビリティ、no-JS基本表示をE2Eで検証してから段階移行し、まずCore Web VitalsとLCP/INP/CLSの実測基準を採る。

## 回帰／同一SHA検証
- `scripts/smoke-test.sh`：Hugo、非カタログ、404、主要ページを検証。
- `tests/browser/category-performance-20261122.spec.mjs`：ナビの2大分類、ラベル、可視カードのみの書換え、Book1グループによるフィルタ。
- `tests/browser/staging.spec.mjs`、`feedback-20261120.spec.mjs`、`feedback-20261121.spec.mjs`、`frontend-ux-regression.spec.mjs`：過去の機能の退行防止。
- 同一SHAのFrontend Smoke、Cloudflare Preview SHA、Playwright Chromiumを全て成功確認し、結果を検証記録に残す。ブラウザのビジュアル確認・モバイル実機確認をCI合格と取り違えない。
