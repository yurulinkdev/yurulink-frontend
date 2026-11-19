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
