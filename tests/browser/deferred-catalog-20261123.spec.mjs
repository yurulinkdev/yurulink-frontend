import { test, expect } from '@playwright/test';

test('トップ案内が重いカタログ取得前に表示され、可視カードだけを描画', async ({page}) => {
  let allowResponse;
  const release = new Promise(resolve => {allowResponse=resolve;});
  await page.route('**/catalog-data/', async route => {
    await release;
    await route.continue();
  });
  try {
    const response = await page.goto('/', {waitUntil:'domcontentloaded'});
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading',{name:'YuruLinkへようこそ'})).toBeVisible();
    await expect(page.locator('#catalog-loading')).toBeVisible();
    expect(await page.locator('#catalog [data-catalog-item]').count()).toBe(0);
  } finally {
    allowResponse();
  }
  await expect(page.locator('#catalog')).toHaveClass(/catalog-ready/, {timeout:30000});
  await expect(page.locator('#catalog [data-catalog-item]:visible')).toHaveCount(20);
  await expect(page.locator('#catalog-loading')).toBeHidden();
  const stats=await page.evaluate(()=>({
    indexCount:window.YuruLinkCatalogItems.length,
    liveDomCount:document.querySelectorAll('#catalog [data-catalog-item]').length,
    fcp:performance.getEntriesByType('paint').find(x=>x.name==='first-contentful-paint')?.startTime ?? null
  }));
  console.log('YURULINK_DEFERRED_CATALOG=' + JSON.stringify(stats));
  expect(stats.indexCount).toBeGreaterThan(3000);
  expect(stats.liveDomCount).toBe(20);
});
