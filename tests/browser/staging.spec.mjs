import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const evidence = 'test-results/evidence';

async function saveEvidence(page, label) {
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, label + '.html'), await page.content());
  await page.screenshot({ path: join(evidence, label + '.png'), fullPage: true });
}

test('desktop: list density, pagination and theme', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-catalog-item]').first()).toBeVisible();
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

  const select = page.locator('#page-size');
  await select.selectOption('50');
  await expect(select).toHaveValue('50');
  await expect(page).toHaveURL(/size=50/);
  await saveEvidence(page, 'desktop-list-50');

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('mobile: list layout and horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  await expect(page.locator('[data-catalog-item]').first()).toBeVisible();
  await page.locator('[data-catalog-view="list"]').click();
  await expect(page.locator('#catalog')).toHaveClass(/catalog-list-view/);
  await saveEvidence(page, 'mobile-list');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
