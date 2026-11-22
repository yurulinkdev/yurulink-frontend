import { test, expect } from '@playwright/test';

test('共通カテゴリは「すべて」＋トップレベル2分類で、名称に推測の公式性表示を付けない', async ({ page }) => {
  for (const url of ['/', '/submit/']) {
    await page.goto(url);
    const nav = page.locator('#category-buttons [data-server-nav-root]');
    const top = nav.locator(':scope > details > summary');
    await expect(top).toHaveCount(2);
    expect(await top.allTextContents()).toEqual(['YouTube動画','その他サイト・SNS']);
    await expect(nav.locator(':scope > :first-child[data-category=""]')).toHaveCount(1);
    await expect(nav.locator('[data-nav-group="channel-group:official"] > summary')).toHaveText('公式チャンネル');
    await expect(nav.locator('[data-nav-group="channel-group:related"] > summary')).toHaveText('コラボ・公認・関連');
    await expect(nav.locator('[data-nav-group="channel-group:other"] > summary')).toHaveText('その他');
    await expect(nav.locator('[data-nav-group="web-sites"] > summary')).toHaveText('Webサイト');
    await expect(nav.locator('[data-nav-group="social"] > summary')).toHaveText('SNS');
    await expect(nav.locator('a[data-category="browse:web-official"], button[data-category="browse:web-official"]')).toHaveText('公式・公認');
    await expect(nav.locator('a[data-category="browse:social-other"], button[data-category="browse:social-other"]')).toHaveText('その他');
    for (const summary of await nav.locator('[data-nav-group^="channel:"] > summary').allTextContents()) {
      expect(summary).not.toMatch(/（公式|（非公式|（未確認|公式性未確認/);
    }
  }
});

test('分類選択後の画面タイトルもtaxonomyナビと同じ表記にする', async ({ page }) => {
  await page.goto('/?category=browse%3Aweb-official');
  await expect(page.locator('#selected-category-title')).toHaveText('公式・公認');
  await page.goto('/?category=browse%3Asocial-other');
  await expect(page.locator('#selected-category-title')).toHaveText('その他');
  await page.goto('/?category=browse%3Ayoutube-group%3Arelated');
  await expect(page.locator('#selected-category-title')).toHaveText('コラボ・公認・関連');
});

test('初期データ件数が大きくてもDOM整形は画面表示分に限定される', async ({ page }) => {
  await page.goto('/');
  const total = await page.locator('#catalog [data-catalog-item]').count();
  expect(total).toBeGreaterThan(3000);
  await expect(page.locator('#catalog')).toHaveClass(/catalog-ready/);
  const formatted = page.locator('#catalog [data-ui-formatted="1"]');
  const visible = page.locator('#catalog [data-catalog-item]:visible');
  await expect(visible).toHaveCount(20);
  expect(await formatted.count()).toBeLessThanOrEqual(20);
  await page.locator('#page-size').selectOption('50');
  await expect(visible).toHaveCount(50);
  expect(await formatted.count()).toBeLessThanOrEqual(50);
  await page.locator('#sort-order').selectOption('views-desc');
  await expect(page.locator('#catalog')).toHaveClass(/catalog-ready/);
  // 結果の切替後も全件を再書込しない。
  expect(await formatted.count()).toBeLessThanOrEqual(100);
});

test('Book1のチャンネル配置カテゴリは公式性の確定フラグに依存しない', async ({ page }) => {
  const fixture = `
    <div id="category-definitions" hidden>
      <span data-category-definition="youtube-channel:UC_A" data-category-type="program" data-label="A" data-order="10" data-channel-group="official" data-officiality="unknown"></span>
      <span data-category-definition="youtube-channel:UC_B" data-category-type="program" data-label="B" data-order="20" data-channel-group="related" data-officiality="unknown"></span>
      <span data-category-definition="youtube-channel:UC_C" data-category-type="program" data-label="C" data-order="30" data-channel-group="other" data-officiality="unknown"></span>
    </div>
    <input id="query"><span id="selected-category"></span><span id="count"></span>
    <div id="category-buttons"></div>
    <ul id="catalog">
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:UC_A" data-category-ids="youtube-channel:UC_A" data-title="A" data-search="A">A</li>
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:UC_B" data-category-ids="youtube-channel:UC_B" data-title="B" data-search="B">B</li>
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="youtube-channel:UC_C" data-category-ids="youtube-channel:UC_C" data-title="C" data-search="C">C</li>
      <li data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="unknown" data-search="unknown">unknown</li>
    </ul><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>
  `;
  const expectations = {
    official:['A'],
    related:['B'],
    other:['C','unknown']
  };
  for (const [group,titles] of Object.entries(expectations)) {
    await page.goto('/?category=' + encodeURIComponent('browse:youtube-group:'+group));
    await page.setContent(fixture);
    await page.addScriptTag({url:'/js/site.js'});
    await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(titles.length);
    expect(await page.locator('[data-catalog-item]:visible').evaluateAll(nodes => nodes.map(el=>el.dataset.title)))
      .toEqual(titles);
  }
});


test('初期表示のナビ・HTML・paint時間の計測値をCIログへ記録する', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('#catalog')).toHaveClass(/catalog-ready/);
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(item => item.name === 'first-contentful-paint');
    return {
      nav_responseEnd_ms: Number((nav?.responseEnd || 0).toFixed(1)),
      dom_content_loaded_ms: Number((nav?.domContentLoadedEventEnd || 0).toFixed(1)),
      load_event_end_ms: Number((nav?.loadEventEnd || 0).toFixed(1)),
      first_contentful_paint_ms: fcp ? Number(fcp.startTime.toFixed(1)) : null,
      catalog_item_dom_count: document.querySelectorAll('#catalog [data-catalog-item]').length,
      nav_node_count: document.querySelectorAll('#category-buttons *').length,
      initially_visible_count: document.querySelectorAll('#catalog [data-catalog-item]:not([hidden])').length,
    };
  });
  console.log('YURULINK_STAGING_PERF_BASELINE=' + JSON.stringify(metrics));
  expect(metrics.catalog_item_dom_count).toBeGreaterThan(3000);
  expect(metrics.nav_node_count).toBeGreaterThan(0);
  expect(metrics.initially_visible_count).toBe(20);
});
