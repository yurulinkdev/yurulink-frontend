import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const evidence = 'test-results/evidence';
const slug = (value) => value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
async function saveEvidence(page, label) {
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, label + '.html'), await page.content());
  await page.screenshot({ path: join(evidence, label + '.png'), fullPage: true });
}
async function openCatalog(page, url = '/') {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('#catalog')).toBeVisible();
  await expect(page.locator('[data-catalog-item]:visible').first()).toBeVisible();
}
async function assertNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('desktop: list density, page size and JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openCatalog(page);
  await saveEvidence(page, 'desktop-card');
  await page.locator('[data-catalog-view="list"]').click();
  await expect(page.locator('#catalog')).toHaveClass(/catalog-list-view/);
  const first = page.locator('[data-catalog-item]:visible').first();
  const image = first.locator('img');
  if (await image.count()) {
    const rect = await image.boundingBox();
    expect(rect?.width).toBeLessThanOrEqual(125);
  }
  await saveEvidence(page, 'desktop-list');
  await page.locator('#page-size').selectOption('50');
  await expect(page).toHaveURL(/size=50/);
  await expect(page.locator('#page-size')).toHaveValue('50');
  await saveEvidence(page, 'desktop-list-50');
  expect(errors).toEqual([]);
  await assertNoOverflow(page);
});

test('mobile: list layout and horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCatalog(page);
  await page.locator('[data-catalog-view="list"]').click();
  await expect(page.locator('#catalog')).toHaveClass(/catalog-list-view/);
  await saveEvidence(page, 'mobile-list');
  await assertNoOverflow(page);
});

test('category URLs: direct access, filtering, pagination and screenshots', async ({ page }) => {
  await openCatalog(page);
  const categoryCounts = await page.locator('[data-catalog-item]').evaluateAll(items => {
    const counts = {};
    for (const item of items) {
      const id = item.dataset.category;
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  });
  const categories = Object.keys(categoryCounts);
  expect(categories.length).toBeGreaterThan(0);
  // Prefer distinct category families, then fill remaining slots by size.
  const sorted = categories.sort((a,b) => categoryCounts[b] - categoryCounts[a]);
  const youtube = sorted.find(id => id.startsWith('youtube-channel:'));
  const other = sorted.find(id => !id.startsWith('youtube-channel:'));
  const selected = [...new Set([youtube, other, ...sorted].filter(Boolean))].slice(0, 5);
  for (const [index, category] of selected.entries()) {
    const params = new URLSearchParams({ category, size: '20' });
    await openCatalog(page, '/?' + params.toString());
    await expect(page.locator('#page-size')).toHaveValue('20');
    const visible = page.locator('[data-catalog-item]:visible');
    const expectedCount = Math.min(categoryCounts[category], 20);
    await expect(visible).toHaveCount(expectedCount);
    const ids = await visible.evaluateAll(items => items.map(item => item.dataset.category));
    expect(ids.every(id => id === category)).toBe(true);
    const label = 'category-' + (index + 1) + '-' + slug(category);
    await saveEvidence(page, label);
    await assertNoOverflow(page);
    if (categoryCounts[category] > 20) {
      await page.locator('#pagination button', { hasText: '2' }).first().click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(Math.min(categoryCounts[category] - 20, 20));
      await saveEvidence(page, label + '-page2');
    }
  }
});


test('catalog metadata: category order and playlist channel labels', async ({ page }) => {
  await openCatalog(page);
  const metadata = await page.locator('[data-catalog-item]').evaluateAll(items => {
    const categories = new Map();
    for (const item of items) {
      if (!item.dataset.category || categories.has(item.dataset.category)) continue;
      categories.set(item.dataset.category, {
        label: item.dataset.categoryLabel,
        order: Number(item.dataset.categoryOrder)
      });
    }
    return [...categories].map(([id, meta]) => ({ id, ...meta }));
  });
  expect(metadata.length).toBeGreaterThan(0);
  expect(metadata.every(x => Number.isFinite(x.order))).toBe(true);
  await page.locator('#category-buttons').evaluate(element => {
    const buttons = [...element.querySelectorAll('button[data-category]')].filter(x => x.dataset.category);
    // 多対多のカテゴリでは「itemのprimary category」から全カテゴリは復元できない。
    // Frontendと同じカテゴリ定義を正本として並び順を検証する。
    const metadata = new Map([...document.querySelectorAll('[data-category-definition]')]
      .map(node => [node.dataset.categoryDefinition, {
        label: node.dataset.label || node.dataset.categoryDefinition,
        order: Number(node.dataset.order)
      }]));
    const primary = [...document.querySelectorAll('[data-catalog-item]')].reduce((map, item) => {
      if (item.dataset.category && !map.has(item.dataset.category)) map.set(item.dataset.category, {
        label: item.dataset.categoryLabel,
        order: Number(item.dataset.categoryOrder)
      });
      return map;
    }, new Map());
    const getMeta = id => metadata.get(id) || primary.get(id) || {order: Number.MAX_SAFE_INTEGER, label: id};
    const groups = buttons.filter(x => x.dataset.category.startsWith('youtube-channel:'));
    const actual = groups.map(x => x.dataset.category);
    const expected = [...actual].sort((a,b) => getMeta(a).order - getMeta(b).order ||
      getMeta(a).label.localeCompare(getMeta(b).label,'ja'));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Channel category order differs from catalog order');
  });
});


test('top pagination changes page without forcing scroll to catalog', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openCatalog(page, '/?size=50');
  await expect(page.locator('#pagination-top button', { hasText: '2' }).first()).toBeVisible();
  await page.locator('#pagination-top').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await page.locator('#pagination-top button', { hasText: '2' }).first().click();
  await expect(page).toHaveURL(/page=2/);
  const after = await page.evaluate(() => window.scrollY);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(5);
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(50);
});


test('catalog interactions: sorting, search, and bottom pagination', async ({ page }) => {
  await openCatalog(page, '/?size=20');
  const visible = page.locator('[data-catalog-item]:visible');
  await page.locator('#sort-order').selectOption('title-asc');
  await expect(page).toHaveURL(/sort=title-asc/);
  const titlesAscending = await visible.evaluateAll(elements => elements.map(x => x.dataset.title || ''));
  expect(titlesAscending).toEqual([...titlesAscending].sort((a,b) => a.localeCompare(b,'ja')));
  await page.locator('#sort-order').selectOption('title-desc');
  const titlesDescending = await visible.evaluateAll(elements => elements.map(x => x.dataset.title || ''));
  expect(titlesDescending).toEqual([...titlesDescending].sort((a,b) => b.localeCompare(a,'ja')));

  const firstTitle = titlesDescending[0];
  expect(firstTitle.length).toBeGreaterThan(0);
  await page.locator('#query').fill(firstTitle);
  await expect(page.locator('[data-catalog-item]:visible').first()).toHaveAttribute('data-title', firstTitle);
  await expect(page).toHaveURL(/q=/);
  await page.locator('#query').fill('');
  await expect(page.locator('#pagination').getByRole('button', { name: '2', exact: true })).toBeVisible();
  await page.locator('#pagination').getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('#pagination-top button[aria-current="page"]')).toHaveText('2');
  await expect(page.locator('#pagination button[aria-current="page"]')).toHaveText('2');
});


test('multiple category memberships: playlist and channel both filter the same item', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <div id="category-definitions" hidden>
      <span data-category-definition="youtube-channel:one" data-label="番組A" data-order="10"></span>
      <span data-category-definition="youtube-playlist:pl1" data-label="特集[番組A]" data-order="20"></span>
    </div>
    <div id="category-buttons"></div><div id="catalog">
      <div data-catalog-item data-category="youtube-channel:one" data-category-ids="youtube-channel:one youtube-playlist:pl1" data-category-label="番組A" data-category-order="10" data-title="動画A" data-search="動画A">動画A</div>
      <div data-catalog-item data-category="youtube-channel:one" data-category-ids="youtube-channel:one" data-category-label="番組A" data-category-order="10" data-title="動画B" data-search="動画B">動画B</div>
    </div><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addScriptTag({ url: '/js/site.js' });
  expect(errors).toEqual([]);
  await expect(page.locator('#category-buttons button[data-category="youtube-playlist:pl1"]')).toHaveText('特集[番組A]');
  // 独立プレイリストは折りたたみグループの内側にある。
  await page.locator('#category-buttons summary', { hasText: 'YouTubeチャンネルプレイリスト' }).click();
  await page.locator('#category-buttons button[data-category="youtube-playlist:pl1"]').click();
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(1);
  await expect(page.locator('[data-catalog-item]:visible')).toHaveAttribute('data-title', '動画A');
  await expect(page).toHaveURL(/category=youtube-playlist/);
  // チャンネル項目も二段階の折りたたみ配下にある。
  await page.locator('#category-buttons summary', { hasText: '番組A', exact: true }).click();
  await page.locator('#category-buttons button[data-category="youtube-channel:one"]').click();
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(2);
});


test('category pagination: category-scoped pages remain consistent', async ({ page }) => {
  await openCatalog(page, '/?size=20');
  const groups = await page.locator('[data-catalog-item]').evaluateAll(items => {
    const counts = new Map();
    for (const item of items) for (const id of (item.dataset.categoryIds || item.dataset.category || '').split(/\s+/).filter(Boolean)) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return [...counts].filter(([, count]) => count > 20).sort((a,b) => b[1] - a[1]);
  });
  expect(groups.length).toBeGreaterThan(0);
  const [category, count] = groups[0];
  await page.goto('/?' + new URLSearchParams({ category, size: '20' }));
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(20);
  await page.locator('#pagination').getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(Math.min(count - 20, 20));
  const valid = await page.locator('[data-catalog-item]:visible').evaluateAll((items, id) =>
    items.every(item => (item.dataset.categoryIds || item.dataset.category || '').split(/\s+/).includes(id)), category);
  expect(valid).toBe(true);
  await expect(page.locator('#pagination-top button[aria-current="page"]')).toHaveText('2');
  await expect(page.locator('#pagination button[aria-current="page"]')).toHaveText('2');
});


test('hierarchical sidebar: channel playlists and virtual top-level categories', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <div id="category-definitions" hidden>
      <span data-category-definition="youtube-channel:one" data-category-type="program" data-label="ゆる言語学ラジオ" data-order="10"></span>
      <span data-category-definition="youtube-playlist:nested" data-category-type="collection" data-collection-kind="playlist" data-channel-name="ゆる言語学ラジオ" data-label="プレイリスト1[ゆる言語学ラジオ]" data-order="20"></span>
      <span data-category-definition="youtube-playlist:other" data-category-type="collection" data-collection-kind="playlist" data-label="ゆるっとアップデータ" data-order="30"></span>
    </div>
    <div id="category-buttons"></div><ul id="catalog">
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:one" data-category-ids="youtube-channel:one youtube-playlist:nested" data-title="番組動画" data-search="番組動画">番組動画</li>
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-playlist:other" data-category-ids="youtube-playlist:other" data-title="独立プレイリスト" data-search="独立プレイリスト">独立プレイリスト</li>
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="単発動画" data-search="単発動画">単発動画</li>
      <li data-catalog-item data-kind="social_profile" data-platform="x" data-category="social_profile" data-title="SNSプロフィール" data-search="SNSプロフィール">SNSプロフィール</li>
      <li data-catalog-item data-kind="website" data-provenance="official" data-category="website" data-title="公式サイト" data-search="公式サイト">公式サイト</li>
      <li data-catalog-item data-kind="website" data-provenance="community" data-category="website" data-title="非公式サイト" data-search="非公式サイト">非公式サイト</li>
      <li data-catalog-item data-kind="website" data-provenance="unknown" data-category="website" data-title="その他サイト" data-search="その他サイト">その他サイト</li>
    </ul><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addScriptTag({ url: '/js/site.js' });
  const labels = await page.locator('#category-buttons summary').allTextContents();
  expect(labels).toContain('YouTubeチャンネル');
  expect(labels).toContain('ゆる言語学ラジオ');
  expect(labels).toContain('YouTubeチャンネルプレイリスト');

  await page.locator('#category-buttons summary', {hasText:'ゆる言語学ラジオ'}).click();
  await page.locator('button[data-category="youtube-playlist:nested"]').click();
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(1);
  await expect(page.locator('[data-catalog-item]:visible')).toHaveAttribute('data-title', '番組動画');

  for (const [id, title] of [
    ['browse:single', '単発動画'],
    ['browse:social', 'SNSプロフィール'],
    ['browse:web-official', '公式サイト'],
    ['browse:web-community', '非公式サイト'],
    ['browse:web-other', 'その他サイト']
  ]) {
    await page.locator('#category-buttons button[data-category="' + id + '"]').click();
    await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(1);
    await expect(page.locator('[data-catalog-item]:visible')).toHaveAttribute('data-title', title);
  }
  expect(errors).toEqual([]);
});

test('live catalog: view-count sort matches actual YouTube video statistics', async ({ page }) => {
  await openCatalog(page, '/?sort=views-desc');
  const counts = await page.locator('[data-catalog-item]').evaluateAll(items =>
    items
      .filter(item => item.dataset.kind === 'video' &&
                      item.dataset.platform === 'youtube' &&
                      /^\\d+$/.test(item.dataset.viewCount || ''))
      .map(item => Number(item.dataset.viewCount))
      .filter(value => Number.isSafeInteger(value))
  );
  expect(counts.length).toBeGreaterThan(100);
  const visibleCounts = async () => page.locator('[data-catalog-item]:visible')
    .evaluateAll(items => items.map(item => Number(item.dataset.viewCount)));
  const descending = [...counts].sort((a, b) => b - a);
  expect(await visibleCounts()).toEqual(descending.slice(0, 20));

  await page.locator('#sort-order').selectOption('views-asc');
  await expect(page).toHaveURL(/sort=views-asc/);
  const ascending = [...counts].sort((a, b) => a - b);
  expect(await visibleCounts()).toEqual(ascending.slice(0, 20));
});

test('view-count sorting: descending, ascending, missing-last and URL state', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <select id="sort-order"><option value="newest">新しい順</option><option value="views-desc">再生数：多い順</option><option value="views-asc">再生数：少ない順</option></select>
    <div id="category-buttons"></div><div id="catalog">
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:x" data-title="B" data-search="B" data-view-count="30">B</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:x" data-title="A" data-search="A" data-view-count="2">A</div>
      <div data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:x" data-title="C" data-search="C" data-view-count="">C</div>
      <div data-catalog-item data-kind="website" data-platform="web" data-category="website" data-title="D" data-search="D">D</div>
    </div><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  await page.addScriptTag({ url: '/js/site.js' });
  const order = () => page.locator('[data-catalog-item]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.title));
  await page.locator('#sort-order').selectOption('views-desc');
  expect(await order()).toEqual(['B','A','C','D']);
  await expect(page).toHaveURL(/sort=views-desc/);
  await page.locator('#sort-order').selectOption('views-asc');
  expect(await order()).toEqual(['A','B','C','D']);
  await expect(page).toHaveURL(/sort=views-asc/);
});
