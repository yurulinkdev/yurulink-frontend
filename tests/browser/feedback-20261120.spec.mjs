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