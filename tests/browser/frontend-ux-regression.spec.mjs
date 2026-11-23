import { test, expect } from '@playwright/test';
import { gotoAndWaitForCatalog } from './catalog-test-helpers.mjs';

// Frontend UI の確定仕様。日付や個別のYouTube動画IDに依存せず、
// Staging に実際に配信されたHugo/JS/CSSをブラウザで検証する。
test('カード・リスト画像は16:9全幅で描画し、画像を伸縮変形せず黒帯をトリミング', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/');
  const card = page.locator('#catalog [data-catalog-item][data-kind="video"]:visible').first();
  const media = card.locator('.catalog-media');
  const image = media.locator('img[data-thumbnail-image]');
  await expect(image).toHaveCount(1);
  await expect(image).toHaveCSS('object-fit', 'cover');
  await expect(media).toHaveCSS('aspect-ratio', '16 / 9');
  await expect(image).toHaveAttribute('width', '320');
  await expect(image).toHaveAttribute('height', '180');
  expect(await image.getAttribute('srcset')).toMatch(/mqdefault.*320w.*hqdefault.*480w/);
  const checkDimensions = async expectedWidth => {
    const dimensions = await page.locator('#catalog [data-catalog-item][data-kind="video"]:visible').first()
      .locator('.catalog-media').evaluate(el => {
        const img = el.querySelector('img');
        const box = el.getBoundingClientRect();
        const ibox = img.getBoundingClientRect();
        return {width:box.width, height:box.height, imageWidth:ibox.width, imageHeight:ibox.height};
      });
    if (expectedWidth) expect(dimensions.width).toBeCloseTo(expectedWidth, 0);
    expect(dimensions.width / dimensions.height).toBeCloseTo(16 / 9, 1);
    expect(dimensions.imageWidth).toBeCloseTo(dimensions.width, 0);
    expect(dimensions.imageHeight).toBeCloseTo(dimensions.height, 0);
  };
  await checkDimensions();
  await page.locator('[data-catalog-view="list"]').click();
  await expect(image).toHaveAttribute('sizes', '(max-width: 639px) 128px, 168px');
  await checkDimensions(168);
  await page.setViewportSize({width:390,height:844});
  await checkDimensions(128);
  await page.locator('[data-catalog-view="grid"]').click();
  await expect(image).toHaveAttribute('sizes', /calc\(100vw - 2rem\)/);
  await expect(image).toHaveCSS('object-fit', 'cover');
});

test('ロゴリンクからのトップ遷移は選択カテゴリだけ解除し、表示形式等は保持', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoAndWaitForCatalog(page,'/catalog/?category=browse:web-other');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yurulink-selected-category-v1')))
    .toBe('browse:web-other');
  await gotoAndWaitForCatalog(page,'/submit/');
  const headerLogo = page.locator('header a[data-reset-category]');
  await expect(headerLogo).toBeVisible();
  // モバイルヘッダーは共通partial内のYuruLink一か所だけ。
  await expect(page.locator('header .brand-wordmark')).toHaveCount(1);
  await expect(page.locator('header a', {hasText:'YuruLink'})).toHaveCount(1);
  await headerLogo.click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yurulink-selected-category-v1'))).toBeNull();
  await expect(page.getByRole('heading',{name:'YuruLinkへようこそ'})).toBeVisible();
  await expect(page.locator('#catalog')).toHaveCount(0);
});

test('すべてのコンテンツ選択はlocalStorageからカテゴリキーを削除', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/catalog/?category=browse:web-other');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yurulink-selected-category-v1')))
    .toBe('browse:web-other');
  await page.locator('#category-buttons button[data-category=""]').click();
  await expect(page.locator('#selected-category-title')).toHaveText('すべてのコンテンツ');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yurulink-selected-category-v1'))).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.has('category')).toBe(false);
});

test('PCのサイドバーロゴも保存カテゴリを解除する', async ({ page }) => {
  await page.setViewportSize({width:1280,height:800});
  await gotoAndWaitForCatalog(page,'/catalog/?category=browse:web-other');
  await gotoAndWaitForCatalog(page,'/help/');
  await page.locator('#category-drawer a[aria-label="YuruLink トップページ"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('yurulink-selected-category-v1'))).toBeNull();
});

test('更新履歴の正規URLは/change-log/、旧URLは廃止', async ({ page }) => {
  const response = await gotoAndWaitForCatalog(page,'/change-log/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading',{name:'更新履歴',exact:true})).toBeVisible();
  await expect(page.locator('footer a[href="/change-log/"]')).toHaveCount(1);
  await expect(page.locator('#category-drawer nav[aria-label="サイト内ページ"] a[href="/change-log/"]')).toHaveCount(1);
  const recent = page.locator('#category-drawer section[aria-label="最近の更新履歴"]');
  const months = recent.locator('li');
  if (await months.count()) {
    await expect(months.first().locator('a')).toHaveAttribute('href', /\/change-log\/\d{4}-\d{2}\/$/);
    await expect(recent).not.toContainText('掲載データの更新履歴はまだありません。');
  } else {
    await expect(recent).toContainText('掲載データの更新履歴はまだありません。');
  }
  for (const old of ['/history/','/news/changelog/']) {
    const res = await gotoAndWaitForCatalog(page,old);
    expect(res?.status(),old).toBe(404);
  }
});

test('スマホの左端右スワイプはtouchmove時に開き、縦スワイプでは開かず、左スワイプで閉じる', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoAndWaitForCatalog(page,'/change-log/');
  const trigger = page.locator('#open-categories');
  const drawer = page.locator('#category-drawer');
  const swipe = (from, to, target) => page.evaluate(({from,to,target}) => {
    const node = target === 'drawer' ? document.getElementById('category-drawer') : document;
    const fire = (type,x,y) => {
      const point = {clientX:x,clientY:y};
      const event = new Event(type,{bubbles:true,cancelable:true});
      Object.defineProperty(event,'touches',{value:type==='touchend'?[]:[point]});
      Object.defineProperty(event,'changedTouches',{value:[point]});
      node.dispatchEvent(event);
    };
    fire('touchstart',from[0],from[1]);
    fire('touchmove',to[0],to[1]);
    fire('touchend',to[0],to[1]);
  }, {from,to,target});
  await swipe([17,150],[33,255],'document');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await swipe([120,150],[230,154],'document');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await swipe([16,210],[106,216],'document');
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await expect(drawer).not.toHaveClass(/-translate-x-full/);
  await swipe([220,220],[122,223],'drawer');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
});
