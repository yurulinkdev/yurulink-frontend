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
    const metadata = [...document.querySelectorAll('[data-catalog-item]')].reduce((map, item) => {
      if (item.dataset.category && !map.has(item.dataset.category)) map.set(item.dataset.category, {
        label: item.dataset.categoryLabel,
        order: Number(item.dataset.categoryOrder)
      });
      return map;
    }, new Map());
    const groups = buttons.filter(x => x.dataset.category.startsWith('youtube-channel:'));
    const actual = groups.map(x => x.dataset.category);
    const expected = [...actual].sort((a,b) => metadata.get(a).order - metadata.get(b).order ||
      metadata.get(a).label.localeCompare(metadata.get(b).label,'ja'));
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
