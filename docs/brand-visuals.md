# ブランドロゴと媒体別画像（開発ブランチ）

## 原本と実装の関係
- 採用ラスター参照原本: [YuruLink_Assets / 02-selected](https://drive.google.com/drive/folders/1MqXkv9N2L_U19ecbR0JjSMIgX3RW1DJH) の `YuruLink-symbol-approved-reference.jpg`
- 制作仕様: [Image-Prompts.md](https://drive.google.com/file/d/1n1MtDBao_ZBxYbhU54BKuVKoOvIRnZaE/view)
- 派生デザインの参考: [03-hero-drafts](https://drive.google.com/drive/folders/1lsNLX8O3ovfN52ocEg5QcfL4LRRkveni)
- フロントエンドの実装素材: `static/brand/yurulink-symbol.svg`
- 共通HTML/CSS画像レンダラー: [Automation Labのvisuals/README.md](https://github.com/yurulinkdev/yurulink-automation-lab/blob/feat/brand-html-image-pipeline-20261119/visuals/README.md)

## 制作・配信方針
ロゴは画像生成AIで再生成せず、固定SVGを配置する。タイトルや説明はHTMLテキストで配置し、背景の波形、ノード、円弧はCSS/SVGパーツで再利用する。Playwrightで定寸PNGへ出力する。

現在のSVGは採用JPEGを輪郭抽出した**初期案**で、幾何曲線への清書と16px/32px/128pxでの視認性検証は未完了。採用JPEGの置き換えは承認前に行わない。

Frontendの `static/brand/` は画像素材の配置先。現時点ではサイトテンプレートへの差し替えは行わず、ページ表示は従来のまま。生成済み画像の本番採用、mainへのマージ、Productionの更新は別途判断する。
