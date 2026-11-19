# ブランド素材のStaging適用（開発ブランチ）

## 目的と正本
- デザイン確定の基準画像: [YuruLink_Assets / 02-selected](https://drive.google.com/drive/folders/1MqXkv9N2L_U19ecbR0JjSMIgX3RW1DJH)
- 制作仕様: [Image-Prompts.md](https://drive.google.com/file/d/1n1MtDBao_ZBxYbhU54BKuVKoOvIRnZaE/view)
- 派生イメージの参考: [03-hero-drafts](https://drive.google.com/drive/folders/1lsNLX8O3ovfN52ocEg5QcfL4LRRkveni)
- HTML/CSSレンダラー: [Automation Lab / visuals](https://github.com/yurulinkdev/yurulink-automation-lab/tree/feat/brand-html-image-pipeline-20261119/visuals)

## 適用対象
- `static/brand/yurulink-symbol-tight.svg`: 採用ラスターの輪郭抽出SVGを余白だけ狭めた、表示用の派生版
- `hugo.toml` の `params.brandLogo`: Stagingで実装済みのモバイルヘッダー／サイドバーのロゴ切替を利用
- `layouts/_default/baseof.html`: 同じSVGをfaviconとして利用

新しいヘッダー構造や既存のUIを上書きしないため、`staging`を起点とした独立ブランチに変更を分離した。
このブランチはまだStagingにはマージしていない。

## 画像の生成・承認
ロゴそのものは再生成せず、背景・波線・ネットワーク点・文言をHTML/CSSで合成し、Playwrightで定寸PNGを出力する。
OGP 1200×630、hero 1600×900、YouTube 1280×720、note 1280×670。
生成物はAutomaton LabのArtifactsに保存し、目視レビュー後に必要な媒体だけへ展開する。

**未対応：** SVGの手動曲線清書と16px/32pxでの比較評価、完成PNGのFrontend `static/` へのコピー、OGPメタタグ設定、実Stagingでのレイアウト・モバイル表示確認。
本番マージ／Production更新は別途承認が必要。

## 画像テンプレート改修 v3（デザインレビュー中）
Automation Labの `feat/brand-html-image-pipeline-20261119` で、4媒体の画像をタイトル優先のエディトリアル構図に変更。採用ロゴを固定SVGとして再利用し、背景はHTML/CSS/SVGの円弧・紙片・ノードで表現する。

- [Actionsで生成したOGP・hero・YouTube・noteのプレビュー](https://github.com/yurulinkdev/yurulink-automation-lab/actions/runs/44502837842)
- [Automation Labの画像生成設計](https://github.com/yurulinkdev/yurulink-automation-lab/blob/feat/brand-html-image-pipeline-20261119/docs/brand-visual-rendering.md)

テンプレートのCI成功とFrontendでの画像採用は別。現時点で当PRに含むのは採用ロゴのナビゲーション・faviconへの組み込みのみで、OGP/heroをサイトに反映した状態ではない。
