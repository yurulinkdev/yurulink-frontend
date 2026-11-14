#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  rm -f content/posts/smoke-ci.md
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
for path in public/index.html public/posts/index.html public/news/index.html; do
  test -s "$path" || { echo "::error::Missing $path"; exit 1; }
done
grep -Eq 'id=("main-content"|main-content)([ >])' public/index.html || { echo '::error::Missing main-content'; head -c 800 public/index.html; exit 1; }
grep -q 'theme-select' public/index.html
echo "::endgroup::"

echo "::group::Markdown single-page smoke"
cat > content/posts/smoke-ci.md <<'EOF'
---
title: "Smoke CI 記事"
date: 2026-11-13
description: "自動テスト用の一時記事"
---
## テスト見出し

本文のテストです。
EOF
npm run build
test -s public/posts/smoke-ci/index.html
grep -q 'Smoke CI 記事' public/posts/smoke-ci/index.html
grep -q 'テスト見出し' public/posts/smoke-ci/index.html
grep -Eq 'rel=("canonical"|canonical)([ >])' public/posts/smoke-ci/index.html || { echo '::error::Missing canonical'; exit 1; }
grep -q 'og:title' public/posts/smoke-ci/index.html
echo "::endgroup::"

echo "::group::Build without catalog JSON"
BACKUP_DIR="$(mktemp -d)"
for file in catalog.json videos.json; do
  if [[ -f "data/public/$file" ]]; then mv "data/public/$file" "$BACKUP_DIR/$file"; fi
done
npm run build
test -s public/index.html
test -s public/posts/index.html
test -s public/news/index.html
test -s public/posts/smoke-ci/index.html
grep -q '統合形式の公開カタログを準備中' public/index.html
echo "::endgroup::"
echo "Smoke test passed."
