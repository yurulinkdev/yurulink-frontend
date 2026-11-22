import { test, expect } from '@playwright/test';

// The browser reads the rendered data-like-count attribute. Missing values are
// never treated as zero, including when sorting in ascending order.
test('likes sorting uses populated video counts and sends unknowns to the end', async ({page}) => {
  await page.goto('/');
  await page.setContent(`
    <label>並び順
      <select id="sort-order">
        <option value="newest">公開日：新しい順</option>
        <option value="likes-desc">高評価数：多い順</option>
        <option value="likes-asc">高評価数：少ない順</option>
      </select>
    </label>
    <span id="selected-category"></span><span id="count"></span>
    <ul id="catalog">
      <li data-catalog-item data-title="中" data-search="中" data-kind="video" data-platform="youtube" data-like-count="150"><span class="catalog-item-likes">未処理</span></li>
      <li data-catalog-item data-title="欠損" data-search="欠損" data-kind="video" data-platform="youtube"><span class="catalog-item-likes">未処理</span></li>
      <li data-catalog-item data-title="ゼロ" data-search="ゼロ" data-kind="video" data-platform="youtube" data-like-count="0"><span class="catalog-item-likes">未処理</span></li>
      <li data-catalog-item data-title="高" data-search="高" data-kind="video" data-platform="youtube" data-like-count="10000"><span class="catalog-item-likes">未処理</span></li>
      <li data-catalog-item data-title="通常リンク" data-search="通常リンク" data-kind="website" data-platform="web"></li>
    </ul>
    <nav id="pagination"></nav><p id="no-results" hidden></p>
  `);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addScriptTag({url:'/js/site.js'});
  await expect(page.locator('#catalog')).toHaveClass(/catalog-ready/);

  const order = () => page.locator('#catalog [data-catalog-item]').evaluateAll(nodes =>
    nodes.map(node => node.dataset.title));
  await page.locator('#sort-order').selectOption('likes-desc');
  expect(await order()).toEqual(['高','中','ゼロ','欠損','通常リンク']);
  await expect(page.locator('[data-title="高"] .catalog-item-likes')).toHaveText('高評価数: 10,000');
  await expect(page.locator('[data-title="ゼロ"] .catalog-item-likes')).toHaveText('高評価数: 0');
  await expect(page.locator('[data-title="欠損"] .catalog-item-likes')).toHaveText('高評価数: 未取得');

  await page.locator('#sort-order').selectOption('likes-asc');
  expect(await order()).toEqual(['ゼロ','中','高','欠損','通常リンク']);
  await expect(page).toHaveURL(/sort=likes-asc/);
  expect(errors).toEqual([]);
});


test('actual generated catalog exposes like counts and sorts correctly', async ({page}) => {
  await page.goto('/catalog-data/');
  await page.locator('#catalog.catalog-ready').waitFor({state:'attached',timeout:30000});
  const summary = await page.evaluate(() => {
    const all = window.YuruLinkCatalogItems || [];
    const likes = all.filter(node => node.dataset.kind === 'video'
      && node.dataset.platform === 'youtube'
      && /^\\d+$/.test(node.dataset.likeCount || ''))
      .map(node => Number(node.dataset.likeCount))
      .filter(value => Number.isSafeInteger(value));
    return {count: likes.length, max: Math.max(...likes)};
  });
  expect(summary.count).toBeGreaterThan(0);
  const inspect = async label => {
    const details = await page.evaluate(() => ({
      count: document.querySelector('#count')?.textContent,
      live: document.querySelectorAll('#catalog [data-catalog-item]').length,
      all: window.YuruLinkCatalogItems?.length,
      query: document.querySelector('#query')?.value,
      category: window.YuruLinkCategoryState?.get(),
      selectedTypes: [...document.querySelectorAll('#content-type-filter input:checked')].map(n => n.value),
      sort: document.querySelector('#sort-order')?.value,
      location: location.href,
      ready: document.querySelector('#catalog')?.className
    }));
    console.log('ACTUAL_LIKES_SORT_' + label + ' ' + JSON.stringify(details));
  };
  await inspect('BEFORE');
  await page.locator('#sort-order').selectOption('likes-desc');
  await inspect('AFTER');
  const descending = await page.locator('#catalog [data-catalog-item]').evaluateAll(nodes =>
    nodes.map(node => Number(node.dataset.likeCount)));
  expect(descending.length).toBeGreaterThan(1);
  expect(descending[0]).toBe(summary.max);
  expect(descending.every(Number.isSafeInteger)).toBe(true);
  expect(descending).toEqual([...descending].sort((a,b) => b - a));

  await page.locator('#sort-order').selectOption('likes-asc');
  const ascending = await page.locator('#catalog [data-catalog-item]').evaluateAll(nodes =>
    nodes.map(node => Number(node.dataset.likeCount)));
  expect(ascending.every(Number.isSafeInteger)).toBe(true);
  expect(ascending).toEqual([...ascending].sort((a,b) => a - b));
});
