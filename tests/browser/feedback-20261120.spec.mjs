import { test, expect } from '@playwright/test';

test('トップお知らせと記事内サイドバー', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#home-news-heading')).toHaveText('おしらせ');
  await page.goto('/posts/about/');
  await expect(page.getByRole('heading', { name: 'このサイトについて', exact: true })).toBeVisible();
  await expect(page.locator('#category-buttons a[href*="?category="]').first()).toBeVisible();
  await expect(page.locator('aside nav[aria-label="サイト内ページ"] a', { hasText: 'リンク集' })).toHaveCount(0);
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

test('SNS投稿分類と動画再生時間条件がURLに同期', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#category-buttons button[data-category="browse:social-posts"]')).toHaveCount(1);
  await page.locator('#duration-range').selectOption('over-60');
  await expect.poll(() => new URL(page.url()).searchParams.get('duration')).toBe('over-60');
  await page.locator('#sort-order').selectOption('duration-desc');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('duration-desc');
  await page.reload();
  await expect(page.locator('#duration-range')).toHaveValue('over-60');
  await expect(page.locator('#sort-order')).toHaveValue('duration-desc');
});

test('GA4・SNSは未設定の場合は空、更新履歴は5件以内', async ({ page }) => {
  await page.goto('/posts/about/');
  await expect(page.locator('#analytics-consent')).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  await expect(page.locator('footer nav[aria-label*="SNS"] a')).toHaveCount(0);
  const updates = page.locator('aside section[aria-label="最近の更新履歴"] li');
  await expect(updates.first()).toBeVisible();
  expect(await updates.count()).toBeLessThanOrEqual(5);
  await expect(page.getByRole('link',{name:'以前の更新履歴はこちら'})).toHaveAttribute('href',/news\/changelog/);
});

test('再生時間の実数値ソート・境界値・未取得の末尾処理', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <select id="sort-order"><option value="newest">新しい順</option><option value="duration-desc">長い順</option><option value="duration-asc">短い順</option></select>
    <select id="duration-range"><option value="all">すべて</option><option value="under-5">5分未満</option><option value="5-20">5-20分</option><option value="20-60">20-60分</option><option value="over-60">60分以上</option><option value="unknown">未取得</option></select>
    <div id="category-buttons"></div><div id="catalog">
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="長い" data-search="長い" data-duration-seconds="3600">長い</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="短い" data-search="短い" data-duration-seconds="299">短い</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="普通" data-search="普通" data-duration-seconds="300">普通</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="未取得" data-search="未取得" data-duration-seconds="">未取得</div>
      <div data-catalog-item data-kind="website" data-platform="web" data-category="website" data-title="サイト" data-search="サイト">サイト</div>
    </div><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  await page.addScriptTag({ url: '/js/site.js' });
  const order = () => page.locator('[data-catalog-item]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.title));
  await page.locator('#sort-order').selectOption('duration-desc');
  expect(await order()).toEqual(['長い','普通','短い','未取得','サイト']);
  await page.locator('#sort-order').selectOption('duration-asc');
  expect(await order()).toEqual(['短い','普通','長い','未取得','サイト']);
  await page.locator('#duration-range').selectOption('under-5');
  expect(await order()).toEqual(['短い']);
  await page.locator('#duration-range').selectOption('5-20');
  expect(await order()).toEqual(['普通']);
  await page.locator('#duration-range').selectOption('over-60');
  expect(await order()).toEqual(['長い']);
  await page.locator('#duration-range').selectOption('unknown');
  expect(await order()).toEqual(['未取得']);
});
