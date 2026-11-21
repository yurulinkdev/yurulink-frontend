import { test, expect } from '@playwright/test';

test('トップのお知らせ枠を撤去・About独立・ヘルプと更新履歴', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#home-news-heading')).toHaveCount(0);
  await page.goto('/about/');
  await expect(page.getByRole('heading', { name: 'このサイトについて', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '記事・お知らせ', exact: true })).toBeVisible();
  // 共通Hugoナビはdetailsによる階層構造。非展開のリンクはDOMにあっても非表示。
  const categoryNav = page.locator('#category-buttons');
  const siteSocial = categoryNav.locator('details[data-nav-group="site-social"]');
  const unknown = siteSocial.locator('details[data-nav-group="source:unknown"]');
  await expect(unknown.locator('a[data-category="browse:web-other"]')).toHaveCount(1);
  await siteSocial.locator(':scope > summary').click();
  await unknown.locator(':scope > summary').click();
  await expect(unknown.locator('a[data-category="browse:web-other"]')).toBeVisible();
  await page.goto('/help/search-guide/');
  await expect(page.getByRole('heading', { name: 'YuruLink の検索・絞り込みガイド' })).toBeVisible();
  await page.goto('/history/');
  await expect(page.getByRole('heading', { name: '更新履歴', exact: true })).toBeVisible();
  // 旧URL・存在しないURLがトップページへ200でフォールバックしないことを検証。
  const removed = await page.goto('/news/welcome/');
  expect(removed?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'ページが見つかりません', exact: true })).toBeVisible();
  const unknownPage = await page.goto('/not-found-check-20261121/');
  expect(unknownPage?.status()).toBe(404);
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

test('Stagingは公開するが検索エンジンへは登録しない', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await page.goto('/about/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('GA4設定済みだがStagingホストでは測定しない・公式Xを表示', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.locator('#analytics-consent')).toHaveAttribute('data-ga4-id', 'G-8Y659Y3Y8Y');
  await expect(page.locator('#analytics-consent')).toBeHidden();
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

test('サイドバーの階層はトップ・About・ヘルプで同じ', async ({ page }) => {
  const categories = async () => page.locator('#category-buttons [data-nav-group]').evaluateAll(nodes =>
    nodes.map(node => node.dataset.navGroup));
  await page.goto('/');
  await expect(page.locator('#home-news-heading')).toHaveCount(0);
  await expect(page.locator('#category-buttons [data-server-nav-root]')).toHaveCount(1);
  const homeGroups = await categories();
  for (const group of ['youtube-channels', 'video-role', 'site-social', 'social-content']) {
    expect(homeGroups).toContain(group);
  }
  await page.goto('/about/');
  expect(await categories()).toEqual(homeGroups);
  await page.goto('/help/search-guide/');
  expect(await categories()).toEqual(homeGroups);
});

test('リンク集の選択カテゴリはヘルプ・About遷移後も保持', async ({ page }) => {
  await page.goto('/?category=browse:web-other');
  const home = page.locator('#category-buttons button[data-category="browse:web-other"]');
  await expect(home).toHaveAttribute('aria-current','true');
  await page.goto('/help/search-guide/');
  const help = page.locator('#category-buttons a[data-category="browse:web-other"]');
  await expect(help).toHaveAttribute('aria-current','true');
  await expect(help).toHaveClass(/bg-panel-muted/);
  await expect(page.locator('#category-buttons details[data-nav-group="source:unknown"]')).toHaveAttribute('open','');
  await page.goto('/about/');
  const about = page.locator('#category-buttons a[data-category="browse:web-other"]');
  await expect(about).toHaveAttribute('aria-current','true');
  await about.click();
  await expect(page).toHaveURL(/category=browse%3Aweb-other/);
  await expect(page.locator('#category-buttons button[data-category="browse:web-other"]')).toHaveAttribute('aria-current','true');
});

test('GA4 Production専用ホスト制限はページの設定に存在', async ({ page }) => {
  await page.goto('/help/');
  await expect(page.locator('#analytics-consent')).toHaveAttribute('data-allowed-hostnames','www.yurulink.com');
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
});


test('投稿CTA・SNSベクターアイコン・動画種別ラベル・高評価順', async ({ page }) => {
  await page.goto('/');
  const form = page.locator('#contribution-link');
  await expect(form).toBeVisible();
  await expect(form).toContainText('リンクを投稿する');
  await expect(form).toHaveAttribute('href','/submit/');
  await page.goto('/submit/');
  await expect(page.locator('#submission-external-link')).toHaveAttribute('href','https://forms.gle/hgYcATGs2oHEbf9v9');
  await expect(page.locator('aside a[href="https://x.com/YuruLinkDev"] img')).toHaveAttribute('src',/icons\/social\/x\.svg/);
  const video = page.locator('li[data-catalog-item][data-kind="video"]').first();
  await expect(video.locator('.catalog-video-format')).toContainText(/動画|ショート|ライブ配信/);
  await page.locator('#sort-order').selectOption('likes-desc');
  await expect.poll(()=>new URL(page.url()).searchParams.get('sort')).toBe('likes-desc');
  await page.reload();
  await expect(page.locator('#sort-order')).toHaveValue('likes-desc');
});

test('SNSのブランドアイコンと通知ベクターはローカル静的アセット', async ({ request }) => {
  for (const path of ['icons/social/x.svg','icons/social/instagram.svg','brand/notifications/development.svg','brand/notifications/operations.svg','brand/notifications/monitoring.svg']) {
    const response = await request.get('/'+path);
    expect(response.status(),path).toBe(200);
    expect(await response.text()).toContain('<svg');
  }
});

test('高評価順は未取得を0高評価とせず末尾に置く', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <select id="sort-order"><option value="newest">新着</option><option value="likes-desc">高評価順</option></select>
    <div id="category-buttons"></div>
    <div id="catalog">
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="A" data-search="A" data-like-count="30">A</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="B" data-search="B" data-like-count="120">B</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="C" data-search="C" data-like-count="">C</div>
    </div><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  await page.addScriptTag({url:'/js/site.js'});
  await page.locator('#sort-order').selectOption('likes-desc');
  const actual = await page.locator('[data-catalog-item]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.title));
  expect(actual).toEqual(['B','A','C']);
});
