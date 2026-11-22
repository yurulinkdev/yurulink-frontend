import { test, expect } from '@playwright/test';
import { gotoAndWaitForCatalog } from './catalog-test-helpers.mjs';

test('No4: Google Formは指定の公開回答URLを案内し、編集URLを露出しない', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/');
  const cta=page.locator('aside #contribution-link');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href','/submit/');
  // CTAはサイト内/submit/へ誘導し、外部公開フォームURLは投稿画面に配置する。
  await gotoAndWaitForCatalog(page,'/submit/');
  await expect(page.locator('#submission-external-link')).toHaveAttribute('href','https://forms.gle/hgYcATGs2oHEbf9v9');
  await expect(page.locator('#submission-external-link')).toHaveAttribute('rel',/noopener/);
  await expect(page.locator('a[href*="/forms/d/1W7ZMlY4pcQk1zWOL3s47StzndF5OxZG-PzRFS63-mSU/edit"]')).toHaveCount(0);
});

test('No4: 同じショート判定をカードラベルと種類フィルタで使用し、日時はJST', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/?category=');
  await page.setContent([
    '<input id="query"><span id="selected-category"></span><span id="count"></span>',
    '<div id="content-type-filter"><input type="checkbox" name="content-type" value="video">',
    '<input type="checkbox" name="content-type" value="short"><input type="checkbox" name="content-type" value="live"></div>',
    '<div id="category-buttons"></div><ul id="catalog">',
    '<li data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="四分半" data-search="四分半" data-duration-seconds="270" data-video-format="video" data-published-at="2026-11-21T12:34:00Z">',
    '<article><a class="catalog-media"><span class="catalog-item-duration">--:--</span></a><div><span data-format-label class="catalog-video-format">動画</span><time datetime="2026-11-21T12:34:00Z" class="catalog-item-date"></time></div></article></li>',
    '<li data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="五分" data-search="五分" data-duration-seconds="300" data-video-format="video"><article><span data-format-label class="catalog-video-format">動画</span></article></li>',
    '<li data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="短いライブ" data-search="短いライブ" data-duration-seconds="180" data-video-format="live"><article><span data-format-label class="catalog-video-format">ライブ配信</span></article></li>',
    '</ul><nav id="pagination-top"></nav><nav id="pagination"></nav><p id="no-results" hidden></p>'
  ].join(''));
  await page.addScriptTag({url:'/js/site.js'});
  await expect(page.locator('li[data-title="四分半"] .catalog-video-format')).toHaveText('ショート');
  await expect(page.locator('li[data-title="五分"] .catalog-video-format')).toHaveText('動画');
  await expect(page.locator('li[data-title="短いライブ"] .catalog-video-format')).toHaveText('ショート');
  await expect(page.locator('li[data-title="四分半"] .catalog-item-date')).toHaveText('公開日: 2026-11-21 21:34');
  await expect(page.locator('li[data-title="四分半"] .catalog-item-duration')).toHaveText('4:30');
  const visible=()=>page.locator('li[data-catalog-item]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.title).sort());
  await page.locator('input[value="short"]').check();
  expect(await visible()).toEqual(['四分半','短いライブ']);
  await page.locator('input[value="short"]').uncheck();
  await page.locator('input[value="video"]').check();
  expect(await visible()).toEqual(['五分']);
});

test('No4: すべてのコンテンツにはサイトとSNSも入り、種類を連動して絞る', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/?category=');
  await page.setContent([
    '<input id="query"><span id="selected-category"></span><span id="count"></span>',
    '<div id="content-type-filter"><input type="checkbox" name="content-type" value="site"><input type="checkbox" name="content-type" value="social"></div>',
    '<div id="category-buttons"></div><ul id="catalog">',
    '<li data-catalog-item data-kind="video" data-platform="youtube" data-category="video" data-title="動画" data-search="動画"><article>動画</article></li>',
    '<li data-catalog-item data-kind="playlist" data-platform="youtube" data-category="browse:playlists" data-title="PL" data-search="PL"><article>PL</article></li>',
    '<li data-catalog-item data-kind="website" data-platform="web" data-category="website" data-title="Web" data-search="Web"><article>Web</article></li>',
    '<li data-catalog-item data-kind="social_profile" data-platform="x" data-category="social_profile" data-title="SNS" data-search="SNS"><article>SNS</article></li>',
    '</ul><nav id="pagination"></nav><p id="no-results" hidden></p>'
  ].join(''));
  await page.addScriptTag({url:'/js/site.js'});
  const visible=()=>page.locator('li[data-catalog-item]:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.title).sort());
  expect(await visible()).toEqual(['PL','SNS','Web','動画']);
  await page.locator('input[value="site"]').check();
  expect(await visible()).toEqual(['Web']);
  await page.locator('input[value="social"]').check();
  expect(await visible()).toEqual(['SNS','Web']);
  await page.locator('input[value="site"]').uncheck();
  await page.locator('input[value="social"]').uncheck();
  expect(await visible()).toEqual(['PL','SNS','Web','動画']);
});

test('No4: プレイリストはグリッドカード、リストでは横長サムネイルで全体表示', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/?category=browse:playlists');
  await page.locator('button[data-catalog-view="grid"]').click();
  const playlist=page.locator('li[data-playlist-card]:visible').first();
  await expect(playlist).toBeVisible();
  await expect(playlist.locator('article.catalog-card')).toHaveCSS('flex-direction','column');
  await page.locator('button[data-catalog-view="list"]').click();
  await expect(playlist.locator('article.catalog-card')).toHaveCSS('display','grid');
  const media=playlist.locator('.catalog-media');
  const width=await media.evaluate(el=>el.getBoundingClientRect().width);
  expect(width).toBeGreaterThanOrEqual(125);
  const img=media.locator('img');
  if(await img.count()) await expect(img).toHaveCSS('object-fit','cover');
});

test('No4: リストは分類と日時を同じ行に置き、再生数と高評価数を次行へ', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/?category=');
  await page.locator('button[data-catalog-view="list"]').click();
  const card=page.locator('li[data-catalog-item][data-kind="video"]:visible').first();
  await expect(card.locator('.catalog-meta-line')).toHaveCount(1);
  await expect(card.locator('h2')).toHaveCount(1);
  const stats=card.locator('.catalog-item-stats');
  await expect(stats).toHaveCount(1);
  await expect(stats.locator('.catalog-item-views')).toBeVisible();
  await expect(stats.locator('.catalog-item-likes')).toBeVisible();
  const thumb=card.locator('a.catalog-media');
  await expect(thumb).toHaveCSS('position','relative');
  const duration=thumb.locator('.catalog-item-duration');
  await expect(duration).toBeVisible();
  await expect(duration).toHaveCSS('position','absolute');
  await expect(thumb.locator('img')).toHaveCSS('object-fit','cover');
  const date=card.locator('time.catalog-item-date');
  if(await date.count()) await expect(date).toHaveText(/公開日: \d{4}-\d\d-\d\d \d\d:\d\d/);
});

test('No4: 公式性未検証のYouTubeチャンネルを公式扱いしない', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/');
  // 公式性認定バッジではなく、Book1のナビ分類を表示する。
  await expect(page.locator('nav#category-buttons [data-nav-group="channel-group:official"]')).toHaveCount(1);
  await expect(page.locator('nav#category-buttons [data-nav-group="channel-group:related"]')).toHaveCount(1);
  await expect(page.locator('nav#category-buttons [data-nav-group="channel-group:other"]')).toHaveCount(1);
  await expect(page.locator('[data-category-definition][data-category-type="program"][data-officiality="unknown"]').first()).toHaveCount(1);
  await expect(page.locator('nav#category-buttons [data-nav-group^="channel:"] > summary').first()).not.toContainText(/（公式|（非公式|（未確認/);
});

test('No4: サイトのSNSアイコンには実アカウント名を付ける', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/');
  const x=page.locator('aside a[href="https://x.com/YuruLinkDev"]');
  await expect(x.locator('img')).toHaveAttribute('src',/icons\/social\/x\.svg/);
  await expect(x).toContainText('@YuruLinkDev');
});
