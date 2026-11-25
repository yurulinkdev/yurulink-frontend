import { test, expect } from '@playwright/test';
import { gotoAndWaitForCatalog } from './catalog-test-helpers.mjs';

test('トップのお知らせ枠を撤去・About独立・ヘルプと更新履歴', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/');
  await expect(page.locator('#home-news-heading')).toHaveCount(0);
  await gotoAndWaitForCatalog(page,'/about/');
  await expect(page.getByRole('heading', { name: 'このサイトについて', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '記事・お知らせ', exact: true })).toBeVisible();
  // 共通Hugoナビはdetailsによる階層構造。非展開のリンクはDOMにあっても非表示。
  const categoryNav = page.locator('#category-buttons');
  const siteSocial = categoryNav.locator('details[data-nav-group="site-social"]');
  const web = siteSocial.locator('details[data-nav-group="web-sites"]');
  await expect(web.locator('a[data-category="browse:web-community"]')).toHaveCount(1);
  await siteSocial.locator(':scope > summary').click();
  await web.locator(':scope > summary').click();
  await expect(web.locator('a[data-category="browse:web-community"]')).toBeVisible();
  await gotoAndWaitForCatalog(page,'/help/search-guide/');
  await expect(page.getByRole('heading', { name: '検索・絞り込みガイド', exact: true })).toBeVisible();
  await gotoAndWaitForCatalog(page,'/change-log/');
  await expect(page.getByRole('heading', { name: '更新履歴', exact: true })).toBeVisible();
  // 旧URL・存在しないURLがトップページへ200でフォールバックしないことを検証。
  const removed = await gotoAndWaitForCatalog(page,'/news/welcome/');
  expect(removed?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'ページが見つかりません', exact: true })).toBeVisible();
  const oldLog = await gotoAndWaitForCatalog(page,'/history/');
  expect(oldLog?.status()).toBe(404);
  const oldNews = await gotoAndWaitForCatalog(page,'/news/changelog/');
  expect(oldNews?.status()).toBe(404);
  const unknownPage = await gotoAndWaitForCatalog(page,'/not-found-check-20261121/');
  expect(unknownPage?.status()).toBe(404);
});

test('初回だけカテゴリを強調', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/');
  await expect(page.locator('#onboarding-hint')).toBeVisible();
  await expect(page.locator('#categories-intro-anchor')).toHaveClass(/onboarding-highlight/);
  await page.locator('#onboarding-hint button').click();
  await page.reload();
  await expect(page.locator('#onboarding-hint')).toHaveCount(0);
});

test('スマホではドロワーを初回強調', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWaitForCatalog(page,'/catalog/');
  await expect(page.locator('#onboarding-hint')).toBeVisible();
  await expect(page.locator('#open-categories')).toHaveClass(/onboarding-highlight/);
});

test('SNS投稿分類と再生時間フィルタ廃止', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/?duration=under-5');
  await expect(page.locator('#category-buttons [data-nav-group="social"]')).toHaveCount(1);
  await expect(page.locator('#duration-range')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.has('duration')).toBe(false);
  await page.locator('#sort-order').selectOption('duration-desc');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('duration-desc');
  await page.reload();
  await expect(page.locator('#sort-order')).toHaveValue('duration-desc');
});

test('Stagingは公開するが検索エンジンへは登録しない', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/');
  const production = ['yurulink-frontend.pages.dev','www.yurulink.com'].includes(new URL(page.url()).hostname);
  if (production) await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  else await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await gotoAndWaitForCatalog(page,'/about/');
  if (production) await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  else await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('GA4はProduction専用・公式Xを表示', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/about/');
  const production = ['yurulink-frontend.pages.dev','www.yurulink.com'].includes(new URL(page.url()).hostname);
  if (production) {
    await expect(page.locator('#analytics-consent')).toHaveAttribute('data-ga4-id', 'G-8Y659Y3Y8Y');
  } else {
    await expect(page.locator('#analytics-consent')).toHaveCount(0);
  }
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
  await expect(page.locator('script[src*="cloudflareinsights.com"]')).toHaveCount(0);
  await expect(page.locator('script[src*="newrelic.com"]')).toHaveCount(0);
  await expect(page.locator('footer nav[aria-label*="SNS"] a')).toHaveCount(1);
  await expect(page.locator('footer nav[aria-label*="SNS"] a')).toHaveAttribute('href','https://x.com/YuruLinkDev');
  const xLink = page.locator('footer nav[aria-label*="SNS"] a[href="https://x.com/YuruLinkDev"]');
  await expect(xLink).toHaveText('@YuruLinkDev');
  await expect(xLink).toHaveAccessibleName('YuruLinkのXを開く');
  await expect(xLink.locator('img')).toHaveAttribute('src', /\/icons\/social\/x\.svg$/);
  const updates = page.locator('aside section[aria-label="最近の更新履歴"] li');
  // Published catalog history can contain entries; validate the sidebar contract, not a fixed empty state.
  const recent = await updates.evaluateAll(items => items.map(li => ({
    date: li.querySelector('time')?.getAttribute('datetime'),
    href: li.querySelector('a')?.getAttribute('href'),
    text: li.textContent.trim()
  })));
  expect(recent.length).toBeLessThanOrEqual(5);
  for (const item of recent) {
    expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(item.href).toMatch(/\/change-log\//);
    expect(item.text.length).toBeGreaterThan(10);
  }
  expect(recent.map(item => item.date)).toEqual(recent.map(item => item.date).sort().reverse());
  if (recent.length) {
    const response = await page.request.get(recent[0].href);
    expect(response.ok()).toBe(true);
  }
  await expect(page.getByRole('link',{name:'すべての更新履歴'})).toHaveAttribute('href',/change-log\//);
});

test('5分未満はショート・300秒は動画（カテゴリと種類の両方に適用）', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/');
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
  await gotoAndWaitForCatalog(page,'/catalog/');
  await expect(page.locator('#home-news-heading')).toHaveCount(0);
  await expect(page.locator('#category-buttons [data-server-nav-root]')).toHaveCount(1);
  const homeGroups = await categories();
  for (const group of ['youtube-channels', 'channel-group:official', 'channel-group:related', 'channel-group:other', 'site-social', 'web-sites', 'social']) {
    expect(homeGroups).toContain(group);
  }
  await gotoAndWaitForCatalog(page,'/about/');
  expect(await categories()).toEqual(homeGroups);
  await gotoAndWaitForCatalog(page,'/help/search-guide/');
  expect(await categories()).toEqual(homeGroups);
});

test('リンク集の選択カテゴリはヘルプ・About遷移後も保持', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/?category=browse:web-community');
  const home = page.locator('#category-buttons button[data-category="browse:web-community"]');
  await expect(home).toHaveAttribute('aria-current','true');
  await gotoAndWaitForCatalog(page,'/help/search-guide/');
  const help = page.locator('#category-buttons a[data-category="browse:web-community"]');
  await expect(help).toHaveAttribute('aria-current','true');
  await expect(help).toHaveClass(/bg-panel-muted/);
  await expect(page.locator('#category-buttons details[data-nav-group="web-sites"]')).toHaveAttribute('open','');
  await gotoAndWaitForCatalog(page,'/about/');
  const about = page.locator('#category-buttons a[data-category="browse:web-community"]');
  await expect(about).toHaveAttribute('aria-current','true');
  await about.click();
  await expect(page).toHaveURL(/category=browse%3Aweb-community/);
  // 3,600件以上のDOMを持つCIではHugoナビの復元完了まで10秒を超えることがある。
  // 一時的な属性チェックではなく、実カテゴリと保存値の双方の復元を待つ。
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yurulink-selected-category-v1')), {timeout:30000})
    .toBe('browse:web-community');
  await expect(page.locator('#category-buttons button[data-category="browse:web-community"]'))
    .toHaveAttribute('aria-current','true', {timeout:30000});
});

test('GA4 Production専用ホスト制限はページの設定に存在', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/help/');
  const production = ['yurulink-frontend.pages.dev','www.yurulink.com'].includes(new URL(page.url()).hostname);
  if (production) {
    await expect(page.locator('#analytics-consent')).toHaveAttribute('data-allowed-hostnames','www.yurulink.com');
  } else {
    await expect(page.locator('#analytics-consent')).toHaveCount(0);
  }
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
});


test('投稿CTA・SNSベクターアイコン・動画種別ラベル・高評価順', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/');
  const production = ['yurulink-frontend.pages.dev','www.yurulink.com'].includes(new URL(page.url()).hostname);
  const form = page.locator('#contribution-link');
  if (production) await expect(form).toHaveCount(0);
  else {
    await expect(form).toBeVisible();
    await expect(form).toContainText('リンクを投稿する');
    await expect(form).toHaveAttribute('href','/submit/');
  }
  await gotoAndWaitForCatalog(page,'/submit/');
  if (production) await expect(page.locator('#submission-external-link')).toHaveCount(0);
  else await expect(page.locator('#submission-external-link')).toHaveAttribute('href','https://forms.gle/hgYcATGs2oHEbf9v9');
  await expect(page.locator('aside a[href="https://x.com/YuruLinkDev"] img')).toHaveAttribute('src',/icons\/social\/x\.svg/);
  // ここからは投稿ページではなくカタログの並び替え・動画メタ情報を検証する。
  await gotoAndWaitForCatalog(page,'/catalog/');
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
  await gotoAndWaitForCatalog(page,'/catalog/');
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
