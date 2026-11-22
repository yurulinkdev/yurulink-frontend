# 初期表示性能：HTML分離・遅延カード描画（Staging）

## 原因と設計
- iPhone Braveの録画（2026-11-22）では約12秒まで白画面、15秒ごろに一覧表示。FAST.comは約350Mbpsだが、これは当該ページのTTFB/LCPではない。
- Backend由来の `data/public/catalog.json` は約12.7MB。旧Hugoトップは約4,800カードを1つのHTMLにSSRし、ブラウザで20件に絞る構造だった。
- `/` は小さな案内・カテゴリ・検索・状態表示を先に返し、`/catalog-data/` のHugo-generated HTMLを後から取得。カードHTMLは `<template>` に格納してブラウザ描画対象から外す。
- ページ切替ごとに旧カードを `template.content` に戻し、可視DOMに最大100カードのみを挿入する。従来のソート・検索・分類・URL・LocalStorageを共通の既存 `site.js` で継続。
- JavaScript無効時・読み込み失敗時の代替として、Hugo生成の公開HTML一覧 `/catalog-data/` にリンクする。同ページは `noindex` を指定する。
- 本変更は **初回ペイントとDOM負荷の軽量化**であり、バックグラウンド転送量自体はなお大きい。次段階ではコンパクト検索索引・カード断片分割・Web Vitals(LCP/INP/CLS)の実機測定を行う。

## 回帰ゲート
- Hugo Smokeでトップに全件カードを埋め込まないこと・HTMLデータソースが100件超であることを検査。
- Previewの同一SHAに対するChromium E2Eで検索、カテゴリ、表示件数、リスト・カード、データ更新の整合を確認。
- iOS実機でネットワークキャッシュ消去からトップ案内の初期描画秒数、一覧の準備秒数を別々に測る。未測定値を実測扱いにしない。
- `main`、DNS、Backendの書込みやProduction公開を含まない。
