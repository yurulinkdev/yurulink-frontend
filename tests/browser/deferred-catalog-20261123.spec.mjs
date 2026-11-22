import { test, expect } from '@playwright/test';

test('ルートは独立したWelcomeのみ。検索一覧・重いデータを取得せず、唯一の案内CTAで一覧へ', async ({page}) => {
  let catalogRequests = 0;
  page.on('request', req => { if (req.url().includes('/catalog-data/')) catalogRequests += 1; });
  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {name: 'YuruLinkへようこそ'})).toBeVisible();
  await expect(page.locator('#query')).toHaveCount(0);
  await expect(page.locator('#catalog')).toHaveCount(0);
  await expect(page.locator('#main-content > section a')).toHaveCount(1);
  await expect(page.locator('#welcome-catalog-link')).toHaveAttribute('href','/catalog/');
  expect(catalogRequests).toBe(0);
  await page.locator('#welcome-catalog-link').click();
  await expect(page).toHaveURL(/\/catalog\/$/);
  await expect(page.locator('#catalog.catalog-ready')).toBeVisible({timeout:30000});
  await expect(page.locator('#catalog [data-catalog-item]:visible')).toHaveCount(20);
});

test('Welcome内部パスはルートと同じ軽量画面・Canonicalはルート', async ({page}) => {
  const response = await page.goto('/welcome/', { waitUntil: 'load' });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', {name: 'YuruLinkへようこそ'})).toBeVisible();
  await expect(page.locator('#catalog')).toHaveCount(0);
  await expect(page.locator('#welcome-catalog-link')).toHaveAttribute('href','/catalog/');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/$/);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
});

test('左メニュー分類はWelcomeから/catalog/へ遷移し、ロゴでWelcomeへ戻る', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/', {waitUntil:'domcontentloaded'});
  const category = page.locator('#category-buttons a[data-category="browse:web-community"]');
  await expect(category).toHaveAttribute('href','/catalog/?category=browse%3Aweb-community');
  await page.locator('#open-categories').click();
  await page.locator('#category-buttons [data-nav-group="site-social"] > summary').click();
  await page.locator('#category-buttons [data-nav-group="web-sites"] > summary').click();
  await category.click();
  await expect(page).toHaveURL(/\/catalog\/\?category=browse%3Aweb-community/);
  await expect(page.locator('#selected-category-title')).not.toHaveText('すべてのコンテンツ');
  await page.locator('header a[data-reset-category]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading',{name:'YuruLinkへようこそ'})).toBeVisible();
});

test('クエリ付きルートもWelcomeのまま。遅延転送・検索HTMLの取得を禁止', async ({page}) => {
  const requests = [];
  page.on('request', request => {
    if (/\/catalog-data\//.test(request.url())) requests.push(request.url());
  });
  const url = '/?category=browse%3Aweb-community&sort=likes-asc';
  const response = await page.goto(url, {waitUntil:'load'});
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/\?category=browse%3Aweb-community&sort=likes-asc$/);
  await expect(page.getByRole('heading',{name:'YuruLinkへようこそ'})).toBeVisible();
  await expect(page.locator('#catalog')).toHaveCount(0);
  await expect(page.locator('#query')).toHaveCount(0);
  await expect(page.locator('script[src*="site.js"]')).toHaveCount(0);
  await expect(page.locator('script[src*="legacy-catalog-redirect.js"]')).toHaveCount(0);
  await page.waitForTimeout(1600);
  await expect(page).toHaveURL(/\/\?category=browse%3Aweb-community&sort=likes-asc$/);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => typeof window.YuruLinkCatalogItems)).toBe('undefined');
});

test('検索画面は独立ページ。遅延カタログ取得まで案内・検索UIを先に表示しDOMは20件のみ', async ({page}) => {
  let allowResponse;
  const release = new Promise(resolve => { allowResponse = resolve; });
  await page.route('**/catalog-data/', async route => {
    await release;
    await route.continue();
  });
  try {
    const response = await page.goto('/catalog/', {waitUntil:'domcontentloaded'});
    expect(response?.status()).toBe(200);
    await expect(page.locator('#query')).toBeVisible();
    await expect(page.locator('#catalog-loading')).toBeVisible();
    await expect(page.locator('#catalog [data-catalog-item]')).toHaveCount(0);
    await expect(page.getByRole('heading',{name:'YuruLinkへようこそ'})).toHaveCount(0);
  } finally {
    allowResponse();
  }
  await expect(page.locator('#catalog')).toHaveClass(/catalog-ready/, {timeout:30000});
  await expect(page.locator('#catalog [data-catalog-item]:visible')).toHaveCount(20);
  await expect(page.locator('#catalog-loading')).toBeHidden();
  const stats = await page.evaluate(() => ({
    indexCount: window.YuruLinkCatalogItems.length,
    liveDomCount: document.querySelectorAll('#catalog [data-catalog-item]').length,
    fcp: performance.getEntriesByType('paint').find(x => x.name === 'first-contentful-paint')?.startTime ?? null
  }));
  console.log('YURULINK_DEFERRED_CATALOG=' + JSON.stringify(stats));
  expect(stats.indexCount).toBeGreaterThan(3000);
  expect(stats.liveDomCount).toBe(20);
});

// 初回訪問ガイドはiPhoneの画面最下部に固定せず、メニューボタンの直下へ。
test('モバイル初回ガイドは左上メニュー直下に配置・クリックで閉じる', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(() => localStorage.removeItem('yurulink-first-visit-hint-v1'));
  await page.goto('/help/', {waitUntil:'load'});
  const hint = page.locator('#onboarding-hint');
  await expect(hint).toBeVisible();
  const geometry = await page.evaluate(() => {
    const hint = document.getElementById('onboarding-hint');
    const header = document.querySelector('#main-content > header');
    const menu = document.getElementById('open-categories');
    const h = hint.getBoundingClientRect();
    const b = header.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    return {
      inHeader: header.contains(hint),
      position: getComputedStyle(hint).position,
      menuBottom: m.bottom,
      headerBottom: b.bottom,
      hintTop: h.top,
      hintBottom: h.bottom,
      viewportHeight: innerHeight
    };
  });
  expect(geometry.inHeader).toBe(true);
  expect(geometry.position).toBe('absolute');
  expect(geometry.hintTop).toBeGreaterThanOrEqual(geometry.menuBottom);
  expect(geometry.hintTop).toBeGreaterThanOrEqual(geometry.headerBottom);
  expect(geometry.hintTop - geometry.headerBottom).toBeLessThan(24);
  expect(geometry.hintBottom).toBeLessThan(geometry.viewportHeight * 0.7);
  await page.locator('#open-categories').click();
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#onboarding-hint')).toHaveCount(0);
});

test('デスクトップ初回ガイドはサイドバーの分類ラベルの直下', async ({page}) => {
  await page.setViewportSize({width:1280,height:900});
  await page.addInitScript(() => localStorage.removeItem('yurulink-first-visit-hint-v1'));
  await page.goto('/', {waitUntil:'load'});
  const hint = page.locator('#onboarding-hint');
  await expect(hint).toBeVisible();
  const placement = await page.evaluate(() => {
    const hint = document.getElementById('onboarding-hint');
    const anchor = document.getElementById('categories-intro-anchor');
    return {
      nextSibling: anchor.nextElementSibling === hint,
      inSidebar: !!hint.closest('#category-drawer'),
      position: getComputedStyle(hint).position,
      anchorBottom: anchor.getBoundingClientRect().bottom,
      hintTop: hint.getBoundingClientRect().top
    };
  });
  expect(placement.inSidebar).toBe(true);
  expect(placement.nextSibling).toBe(true);
  expect(placement.position).not.toBe('fixed');
  expect(placement.hintTop).toBeGreaterThanOrEqual(placement.anchorBottom);
  await hint.getByRole('button',{name:'案内を閉じる'}).click();
  await expect(hint).toHaveCount(0);
});
