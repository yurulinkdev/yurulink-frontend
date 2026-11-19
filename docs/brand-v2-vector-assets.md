# YuruLink v2 減色・ベクター化ブランド資産（2026-11-19）
原本：Google Drive YuruLink_Assets/02-selected/YuruLink-symbol-approved-reference.jpg（ID: 145ljbyXFFfWL6cW2KXTnUT7_uhKGrVSC）。JPEGは変更しない。

## 生成仕様
- 元JPEGをHSV彩度でマスクし、彩度が高い6つの連結領域を抽出。輪郭座標をSVGへ変換し、シンボルの輪郭と余白を保持した。再描画AIは使わない。
- シンボルはベタ色 #A35B46、背景は透明。PNG/faviconsは同一SVGからのラスター化。中間調やJPEG圧縮由来の色揺らぎは持ち込まない。
- OGPはSVGマスター、HTML/SVGテキスト、意味のある背景/装飾を分離したデザインから淡色・濃色PNGを生成。OGP採用はユーザーの最終デザイン確認前のPreview暫定値。
- 背景パレットは #FBF9F6 / #342B28、色差が機能上必要なライト/ダークには別色を許容。余分なロゴ固有色を増やさない。
- 新マスター static/brand/yurulink-symbol-master.svg 。Hero 1600x900、Forms 1600x400、OGP 1200x630、favicon32、Touch180、透過1024を各役割のパスに格納。
- 旧トレース、透過PNG、OGP、faviconは docs/archive/brand-pre-v2/ に退避。static 配下には古い素材を残さない。データの正本はGoogle Driveの原本JPEGと新ベクターマスター。
- 設計検証：曲線の手動清書や商標調査を完了したという意味ではない。縮小視認性とPreviewで実際の描画を確認し、Production反映は別途承認する。


## v4 パイプラインと反映先（2026-11-19）

画像素材の導出は AutomationLab `feat/brand-html-image-pipeline-20261119` の `visuals/regenerate-brand.py` と `visuals/render.mjs` に一本化する。採用JPEGのSHA-256は `ea042d9cd59c072e3e6818662f13ada5a9fc9489465e013b9e9d41f95d5319fb`。JPEGは変更しない。マスターSVGは `#A35B46` の単色・透明、6パーツ。採用原本マスクとの輪郭IoUは約98.59%（手動曲線清書完了を意味しない）。

| 用途 | 本Frontend stagingの参照先 |
| --- | --- |
| ヘッダー／ドロワー／SVG favicon | `static/brand/yurulink-symbol-master.svg` |
| PNG透過ロゴ（512） | `static/brand/yurulink-symbol-approved-transparent.png` |
| 透過ロゴ1024 | `static/brand/yurulink-symbol-flat-1024.png` |
| PNG favicon32 | `static/favicon-32.png` |
| Apple Touch180 | `static/apple-touch-icon.png` |
| OGPライト（Preview暫定） | `static/ogp/yurulink-light.png` |
| OGPダーク（候補） | `static/ogp/yurulink-dark.png` |
| ヒーロー1600×900 | `static/brand/hero-light-1600x900.png` |
| Google Formsヘッダー1600×400（未適用） | `static/brand/form-header-1600x400.png` |

Backend develop `assets/brand/yurulink-symbol-master.svg` は同一SHA-1 Git blob `6524fb7732ba69a4faa7a17100697931753c8133`。AutomationLab `visuals/assets/yurulink-symbol.svg` が派生素材の制作正本。

OGP・ヒーロー・フォームヘッダーの文字、装飾、テーマ別背景はHTML/CSSで管理し、ロゴに不必要な濃淡やノイズを追加しない。以前の「知識をつなぐ〜」は未承認のため不採用。旧画像は `docs/archive/brand-pre-v2/` とアーカイブブランチに保管し、公開 `static` では新派生素材に置換した。

再現性：AutomationLab GitHub Actions [run 44549192979](https://github.com/yurulinkdev/yurulink-automation-lab/actions/runs/44549192979) 成功。フォーム画像は**ファイルを生成したのみ**で、Google Formsの実際のヘッダー更新は未実施。本番OGPの最終採用・main・Production反映には承認を求める。
