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

## 2026-11-20 OGPデザイン採用・人間向け画像制作キット

ユーザーが現在のライト／ダーク両OGPのデザインを肯定評価し、**双方を媒体別の採用バリエーション**とした。メインコピーのみ「**ゆる関連のコンテンツ、集めました**」へ変更。読点位置で自然に改行する表示処理をAutomationLab HTML-to-Imageのプリセットに追加。ロゴシンボルは採用JPEG由来の単色SVGを維持し、AIによる再描画はしていない。

- OGPライト：`static/ogp/yurulink-light.png`。GitHub blob SHA `e262fcd053a42604c942affd357cee51d6d4be95`。
- OGPダーク：`static/ogp/yurulink-dark.png`。GitHub blob SHA `bf50417fd73232f73cb5206f3fd3b71d213477a4`。
- 両画像のサイズは1200×630。Frontend staging 2026-11-20 commit `6fa8717e1d49c93e78c3f1c04041b632d4668500` で配置し、AutomationLab生成物とblob SHA一致を読戻し検証した。Production/mainは触れていない。
- 再生成の**制作正本**：AutomationLab `feat/brand-html-image-pipeline-20261119` の `visuals/template.html`、`visuals/template.css`、`visuals/render.mjs`、`visuals/presets.json`、`visuals/assets/yurulink-symbol.svg`。PNGは成果物であり、画像編集ソフトで直接文字を書き換えて正本にしない。
- 人間向け `visuals/toolkit-README.md` と `npm run brand:ogp:light` / `brand:ogp:dark` / `brand:all` を用意。ZIPをGoogle Drive `YuruLink_Assets/05-HTML-to-Image-Toolkit-20261120` に格納： https://drive.google.com/file/d/1HxTLqzED9TIRCxiU9Ke_Id8LgCL0LnSB/view
- 将来の装飾パーツはSVGまたはHTML/CSSを原則。ラスタイラストは元データを保護してディザリングなしで減色し、単純な形状ではベクタートレースして出力の目視確認を行う。意図されたグラデーション・陰影・半透明は許可。AutomationLab `visuals/prepare-image-part.py` 参照。

PreviewのCIとOGPタグ配信の確認は実行後に別途報告する。OGPコピーの承認は初期Production切替の事前承認と同一ではない。

## 2026-11-23 OGPライト改訂

- 現行採用OGPのライト配色と左右分割構図、ロゴSVGをそのまま維持し、上部の「関連コンテンツ」の眉見出しのみ非表示。
- メイン文言「**ゆる関連を繋ぐ。**」、補足文言「**ゆる言語学ラジオ関連コンテンツへの統合リンク**」に変更。
- 制作正本はAutomationLab `visuals/presets.json` と `template.html/template.css`。Playwright ChromiumによるHTML-to-Image（1200×630）。画像生成AIによる新規の描画は禁止。
- 公開 `static/ogp/yurulink-light.png` とGoogle Drive YuruLink_Assetsの2026-11-23版を同一PNGバイト列で同期。アクセント `#A35B46`、背景 `#FBF9F6`、主文字 `#342B28`。
- [運営方針（運営者側GitHub）](https://github.com/Halhira/WebSite/blob/main/docs/yurulink/principle.md)に基づく非公式の統合リンク集としての表現。
- `og:image`、`twitter:image`、`og:image:alt`、`twitter:image:alt`、`theme-color` を更新。Production `main` は未変更。


## 2026-11-24 B案マスターと画像管理

内側補色 #F4EFE7、外形 #A35B46 の7パスSVGを採用。採用JPEG・補色前単色マスターは保持。Driveの `01-main/` と `02-usage/` に最新版を、`90-history/` に制作履歴を、`00-toolkit/` に制作キットを保存する。Frontendの管理素材は `assets/brand-library/`（制作履歴を含めない）。`static/` の既存URLは変更せず、同一Git blobに同期する。詳細は [素材マニフェスト](../assets/brand-library/manifest.json)。B案を用いて32/180/256/512/1024px、ヒーロー、OGP、フォーム、SNS用アイコン、XヘッダーをHTML-to-Imageで再生成。外部SNS・Google Formへの実適用とProduction反映は別工程。
