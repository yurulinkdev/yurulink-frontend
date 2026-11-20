import { test, expect } from '@playwright/test';

test('トップの案内・About独立・ヘルプと更新履歴', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#home-news-heading')).toHaveText('おしらせ');
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'このサイトについて', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '記事・お知らせ', exact: true })).toBeVisible();
  await expect(page.locator('#category-buttons a[href*="?category="]').first()).toBeVisible();
  await page.goto('/help/search-guide/');
  await expect(page.getByRole('heading', { name: 'YuruLink の検索・絞り込みガイド' })).toBeVisible();
  await page.goto('/history/');
  await expect(page.getByRole('heading', { name: '更新履歴', exact: true })).toBeVisible();
  await page.goto('/news/welcome/');
  await expect(page.locator('main h1')).toHaveCount(0);
});

test('初回だけカテゴリを強調', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#onboarding-hint')).toBeVisible();
  await expect(page.locator('#categories-intro-anchor')).toHaveClass(/onboarding-highlight/);
  await page.locator('#onboarding-hint button').click();
  await page.reload();
  await expect(page.locator('#onboarding-hint')).toHaveCount(0);
});

test('スマホではドロワーを初回強調', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#onboarding-hint')).toBeVisible();
  await expect(page.locator('#open-categories')).toHaveClass(/onboarding-highlight/);
});

test('SNS投稿分類と再生時間フィルタ廃止', async ({ page }) => {
  await page.goto('/?duration=under-5');
  await expect(page.locator('#category-buttons button[data-category="browse:social-posts"]')).toHaveCount(1);
  await expect(page.locator('#duration-range')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.has('duration')).toBe(false);
  await page.locator('#sort-order').selectOption('duration-desc');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('duration-desc');
  await page.reload();
  await expect(page.locator('#sort-order')).toHaveValue('duration-desc');
});

test('GA4・Browser監視は未設定なら無効、公式Xアカウントを表示', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('#analytics-consent')).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  await expect(page.locator('script[src*="cloudflareinsights.com"]')).toHaveCount(0);
  await expect(page.locator('script[src*="newrelic.com"]')).toHaveCount(0);
  await expect(page.locator('footer nav[aria-label*="SNS"] a')).toHaveCount(1);
  await expect(page.locator('footer nav[aria-label*="SNS"] a')).toHaveAttribute('href','https://x.com/YuruLinkDev');
  const updates = page.locator('aside section[aria-label="最近の更新履歴"] li');
  expect(await updates.count()).toBe(0);
  await expect(page.getByRole('link',{name:'すべての更新履歴'})).toHaveAttribute('href',/history\//);
});

test('5分未満はショート・300秒は動画（カテゴリと種類の両方に適用）', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <div id="content-type-filter"><input type="checkbox" name="content-type" value="video">
      <input type="checkbox" name="content-type" value="short"></div>
    <div id="category-buttons"></div><div id="catalog">
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="299秒" data-search="299秒" data-duration-seconds="299" data-video-format="video">299秒</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="300秒" data-search="300秒" data-duration-seconds="300" data-video-format="video">300秒</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="未取得" data-search="未取得" data-duration-seconds="" data-video-format="video">未取得</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="ライブ100秒" data-search="ライブ" data-duration-seconds="100" data-video-format="live">ライブ100秒</div>
    </div><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  await page.addScriptTag({url:'/js/site.js'});
  const titles = () => page.locator('[data-catalog-item]:visible').evaluateAll(nodes => nodes.map(n=>n.dataset.title).sort());
  await page.locator('input[name="content-type"][value="short"]').check();
  expect(await titles()).toEqual(['299秒','ライブ100秒']);
  await page.locator('input[name="content-type"][value="short"]').uncheck();
  await page.locator('input[name="content-type"][value="video"]').check();
  expect(await titles()).toEqual(['300秒','未取得']);
});
