#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  rm -f content/about/smoke-ci.md
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
for path in public/index.html public/about/index.html public/change-log/index.html public/help/index.html public/submit/index.html; do
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
grep -q 'page-size' public/index.html
grep -q 'pagination' public/index.html
# 投稿ページはGoogle側フォームのみ埋め込み、管理用フォームURLは含めない。
grep -q 'submission-form-frame' public/submit/index.html
grep -q 'forms.gle/hgYcATGs2oHEbf9v9' public/submit/index.html
! grep -q 'forms/d/1W7ZMlY4pcQk1zWOL3s47StzndF5OxZG-PzRFS63-mSU/edit' public/submit/index.html
# ドロワーのキーボード操作と非表示時のフォーカス抑止を静的検査
grep -q "event.key === 'Escape'" static/js/theme-control.js
grep -q "event.key !== 'Tab'" static/js/theme-control.js
grep -q 'drawer.inert' static/js/theme-control.js
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
grep -q '統合形式の公開カタログを準備中' public/index.html
echo "::endgroup::"
grep -q "catalog-list-view" assets/css/input.css
grep -q "catalog-item-date" layouts/index.html
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

# First paint must never serialize thousands of cards into index.html.
test -s public/catalog-data/index.html
grep -q 'id="catalog-loading"' public/index.html || grep -q 'id=catalog-loading' public/index.html
test "$( (grep -o 'data-catalog-item' public/index.html || true) | wc -l)" -eq 0
test "$(grep -o 'data-catalog-item' public/catalog-data/index.html | wc -l)" -gt 100
grep -q 'YuruLinkへようこそ' public/index.html
echo "Smoke test passed."
