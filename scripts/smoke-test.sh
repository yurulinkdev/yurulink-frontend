#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  rm -f content/about/smoke-ci.md content/change-log/2001-01.md
  if [[ -d "${BACKUP_DIR:-}" ]]; then
    for file in catalog.json videos.json; do
      if [[ -f "$BACKUP_DIR/$file" ]]; then
        mkdir -p data/public
        mv "$BACKUP_DIR/$file" "data/public/$file"
      fi
    done
    rmdir "$BACKUP_DIR" || true
  fi
}
trap cleanup EXIT

echo "::group::Default build"
npm run build
for path in public/index.html public/welcome/index.html public/catalog/index.html public/about/index.html public/change-log/index.html public/help/index.html public/submit/index.html; do
  test -s "$path" || { echo "::error::Missing $path"; exit 1; }
done
grep -Eq 'id=("main-content"|main-content)([ >])' public/index.html || { echo '::error::Missing main-content'; head -c 800 public/index.html; exit 1; }
grep -q 'theme-toggle' public/index.html
grep -q 'theme-auto' public/index.html
# Stagingの更新履歴は正規URLだけを生成する。
test ! -e public/history/index.html
test ! -e public/news/changelog/index.html
grep -q 'prefers-color-scheme: dark' assets/css/tokens.css
grep -q "localStorage.removeItem(key)" static/js/theme-control.js
grep -q 'page-size' public/catalog/index.html
grep -q 'pagination' public/catalog/index.html
# Welcome route and root must be light, standalone pages with a single main CTA.
grep -Eq 'id=("welcome-catalog-link"|welcome-catalog-link)([ >])' public/index.html
grep -Eq 'id=("welcome-catalog-link"|welcome-catalog-link)([ >])' public/welcome/index.html
! grep -q 'id="query"' public/index.html
! grep -q 'id="catalog"' public/index.html
! grep -q 'catalog-data/' public/index.html
# Root must remain Welcome even for old query-based catalog bookmarks.
! grep -q 'legacy-catalog-redirect' public/index.html
! grep -q 'js/site.js' public/index.html
test ! -e static/js/legacy-catalog-redirect.js
grep -Eq 'href=("/catalog/"|/catalog/)([ >])' public/index.html
! grep -Eq 'id=("welcome-catalog-link"|welcome-catalog-link)([ >])' public/catalog/index.html
# 投稿ページはGoogle側フォームのみ埋め込み、管理用フォームURLは含めない。
if [[ "${CF_PAGES_BRANCH:-${GITHUB_REF_NAME:-staging}}" == "main" ]]; then
  ! grep -q 'submission-form-frame' public/submit/index.html
  ! grep -q 'submission-external-link' public/submit/index.html
else
  grep -q 'submission-form-frame' public/submit/index.html
  grep -q 'forms.gle/hgYcATGs2oHEbf9v9' public/submit/index.html
fi
! grep -q 'forms/d/1W7ZMlY4pcQk1zWOL3s47StzndF5OxZG-PzRFS63-mSU/edit' public/submit/index.html
# ドロワーのキーボード操作と非表示時のフォーカス抑止を静的検査
grep -q "event.key === 'Escape'" static/js/theme-control.js
grep -q "event.key !== 'Tab'" static/js/theme-control.js
grep -q 'drawer.inert' static/js/theme-control.js
node --check static/js/site.js
# First paint must never serialize thousands of cards into index.html.
test -s public/catalog-data/index.html
grep -q 'id="catalog-loading"' public/catalog/index.html || grep -q 'id=catalog-loading' public/catalog/index.html
test "$( (grep -o 'data-catalog-item' public/catalog/index.html || true) | wc -l)" -eq 0
test "$(grep -o 'data-catalog-item' public/catalog-data/index.html | wc -l)" -gt 100
grep -q 'YuruLinkへようこそ' public/index.html
! grep -q 'YuruLinkへようこそ' public/catalog/index.html
echo "YURULINK_HTML_BYTES:"; wc -c public/index.html public/welcome/index.html public/catalog/index.html public/catalog-data/index.html
echo "::endgroup::"

echo "::group::Markdown single-page smoke"
cat > content/about/smoke-ci.md <<'EOF'
---
title: "Smoke CI 記事"
date: 2026-11-13
description: "自動テスト用の一時記事"
---
## テスト見出し

本文のテストです。
EOF
npm run build
test -s public/about/smoke-ci/index.html
grep -q 'Smoke CI 記事' public/about/smoke-ci/index.html
grep -q 'テスト見出し' public/about/smoke-ci/index.html
grep -Eq 'rel=("canonical"|canonical)([ >])' public/about/smoke-ci/index.html || { echo '::error::Missing canonical'; exit 1; }
grep -q 'og:title' public/about/smoke-ci/index.html
echo "::endgroup::"

echo "::group::Monthly changelog and sidebar"
# テスト用記事は実公開の変更履歴に含めない。
test ! -e content/change-log/2001-01.md
cat > content/change-log/2001-01.md <<'EOF'
---
title: "2001年1月"
date: 2001-01-09T00:00:00+09:00
lastmod: 2001-01-09T00:00:00+09:00
last_update: "2001-01-09"
latest_summary: "動画1件 / リンク1件追加"
daily_summaries: [{"date":"2001-01-09","summary":"動画1件 / リンク1件追加"},{"date":"2001-01-08","summary":"動画1件追加"},{"date":"2001-01-02","summary":"動画1件追加"}]
---
## Week2

### 2001-01-09

下記のリンクを更新しました。

- テスト番組：[動画A](https://www.youtube.com/watch?v=abcdefghijk)
- Webサイト：サイトB

### 2001-01-08

下記のリンクを更新しました。

- テスト番組：動画C

## Week1

### 2001-01-02

下記のリンクを更新しました。

- テスト番組：動画D
EOF
npm run build
test -s public/change-log/2001-01/index.html
grep -q '動画1件 / リンク1件追加' public/index.html
grep -q '2001-01-09' public/index.html
grep -q '動画1件 / リンク1件追加' public/change-log/index.html
grep -q 'https://www.youtube.com/watch?v=abcdefghijk' public/change-log/2001-01/index.html
node --input-type=module <<'EOF'
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const html = readFileSync('public/change-log/2001-01/index.html', 'utf8');
const headings = Array.from(html.matchAll(/<h[23](?:\s[^>]*)?>([^<]+)<\/h[23]>/g), match => match[1]);
assert.deepEqual(headings.filter(text => /^(Week\d|2001-01-\d\d)$/.test(text)),
  ['Week2', '2001-01-09', '2001-01-08', 'Week1', '2001-01-02']);
assert.ok(html.includes('Webサイト：サイトB'));
assert.match(html, /<a[^>]*href=["']?https:\/\/www\.youtube\.com\/watch\?v=abcdefghijk["']?[^>]*>動画A<\/a>/);
for (const path of ['public/index.html','public/change-log/index.html']) {
  const page = readFileSync(path, 'utf8');
  assert.match(page, /2001-01-09<\/time>：動画1件 \/ リンク1件追加/);
  assert.match(page, /2001-01-08<\/time>：動画1件追加/);
}
assert.ok(html.includes('下記のリンクを更新しました。'));
EOF
rm content/change-log/2001-01.md
rm -rf public/change-log/2001-01
npm run build
test ! -e public/change-log/2001-01/index.html
echo "::endgroup::"

echo "::group::Build without catalog JSON"
BACKUP_DIR="$(mktemp -d)"
for file in catalog.json videos.json; do
  if [[ -f "data/public/$file" ]]; then mv "data/public/$file" "$BACKUP_DIR/$file"; fi
done
npm run build
test -s public/index.html
test -s public/about/index.html
test -s public/change-log/index.html
test -s public/about/smoke-ci/index.html
! grep -q 'id="catalog"' public/catalog/index.html
! grep -q 'id="query"' public/catalog/index.html
! grep -q 'id="category-buttons"' public/index.html
! grep -q 'id="category-buttons"' public/about/index.html
! grep -q 'js/site.js' public/catalog/index.html
! grep -q 'welcome-catalog-link' public/index.html
grep -q 'YuruLinkへようこそ' public/index.html
! grep -q 'id="catalog"' public/index.html
echo "::endgroup::"
grep -q "catalog-list-view" assets/css/input.css
grep -q "catalog-item-date" layouts/catalog-data/list.html
# main固有のDiscord通知資産をstagingへ保持した場合の静的安全検証。
echo "::group::Discord notification route validation"
node --check ops/notifications/notify-discord.js
node --check ops/notifications/validate-routes.js
node ops/notifications/validate-routes.js
echo "::endgroup::"

# 単一Pagesプロジェクトへの移行後は旧StagingのURLや比較処理に依存しない。
echo "::group::Single Pages project routing"
node --check playwright.config.mjs
grep -Fq "baseURL: process.env.STAGING_URL || 'https://staging.yurulink-frontend.pages.dev/'" playwright.config.mjs
test ! -e scripts/compare-staging.mjs
test ! -e .github/workflows/compare-staging.yml
! grep -Fq 'yurulink-frontend-staging' .github/workflows/cloudflare-inventory-request.yml
echo "::endgroup::"

echo "Smoke test passed."

# Cloudflare Pagesは通常Hugoをproduction環境で呼び出しても、プレビューはCF_PAGES_BRANCHで確実に区別する。
echo "::group::Branch-specific OGP"
CF_PAGES_BRANCH=staging npm run build
grep -Fq "ogp/yurulink-staging.png" public/index.html
grep -Fq "ogp/yurulink-staging.png" public/about/index.html
grep -Fq "STAGING" public/index.html
test -s public/ogp/yurulink-staging.png
CF_PAGES_BRANCH=main npm run build
grep -Fq "ogp/yurulink-light.png" public/index.html
! grep -Fq "ogp/yurulink-staging.png" public/index.html
hugo --minify --environment staging >/dev/null
grep -Fq "ogp/yurulink-staging.png" public/index.html
hugo --minify --environment production >/dev/null
grep -Fq "ogp/yurulink-light.png" public/index.html
echo "::endgroup::"
