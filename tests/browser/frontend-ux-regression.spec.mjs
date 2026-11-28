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
    await expect(months.first().locator('a')).toHaveAttribute('href', /\/change-log\/\d{4}-\d{2}\/(?:#\d{4}-\d{2}-\d{2})?$/);
    await expect(recent).not.toContainText('掲載データの更新履歴はまだありません。');
  } else {
    await expect(recent).toContainText('掲載データの更新履歴はまだありません。');
  }
  for (const old of ['/history/','/news/changelog/']) {
    const res = await gotoAndWaitForCatalog(page,old);
    expect(res?.status(),old).toBe(404);
  }
});

test('スマホのスワイプはブラウザの左端を避け、水平操作を移動中に確定する', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoAndWaitForCatalog(page,'/change-log/');
  const trigger = page.locator('#open-categories');
  const drawer = page.locator('#category-drawer');
  const touch = (type, x, y, selector = '#main-content', count = 1) => page.evaluate(({type,x,y,selector,count}) => {
    const node = document.querySelector(selector);
    const point = {clientX:x,clientY:y};
    const event = new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,'touches',{value:type==='touchend'||type==='touchcancel'?[]:Array(count).fill(point)});
    Object.defineProperty(event,'changedTouches',{value:[point]});
    node.dispatchEvent(event);
    return event.defaultPrevented;
  }, {type,x,y,selector,count});
  const swipe = async (from, to, selector) => {
    expect(await touch('touchstart',...from,selector)).toBe(false);
    expect(await touch('touchmove',...to,selector)).toBe(false);
    expect(await touch('touchend',...to,selector)).toBe(false);
  };
  // 画面端はOS・ブラウザの戻る操作に委ねる。
  await swipe([5,150],[110,153]);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await swipe([11,150],[130,153]);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await swipe([97,150],[230,154]);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  // 垂直操作・斜め操作・短い操作では開かない。
  await swipe([48,150],[60,255]);
  await swipe([48,150],[123,220]);
  await swipe([48,150],[85,152]);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await touch('touchstart',48,210);
  await touch('touchmove',90,216);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await touch('touchcancel',90,216);
  await touch('touchmove',138,216);
  await touch('touchend',138,216);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  // 複数指・途中の縦方向ロック・ボタン操作を優先。
  await touch('touchstart',48,210);
  await touch('touchmove',60,215,'#main-content',2);
  await touch('touchend',140,215);
  await touch('touchstart',48,210);
  await touch('touchmove',51,245);
  await touch('touchmove',145,215);
  await touch('touchend',145,215);
  await swipe([48,26],[140,26],'#open-categories');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  // 内側の補助スワイプで開く。閾値未満は閉じたまま、64px到達時点で開く。
  expect(await touch('touchstart',48,210)).toBe(false);
  expect(await touch('touchmove',111,216)).toBe(false);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  expect(await touch('touchmove',112,216)).toBe(false);
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await expect(drawer).not.toHaveClass(/-translate-x-full/);
  // 同じ指の後続moveやendで再度開閉しない。
  await touch('touchmove',48,210);
  await touch('touchend',48,210);
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  // 閉じる操作は従来どおり指離しで確定する。
  await touch('touchstart',220,220,'#category-drawer');
  await touch('touchmove',122,223,'#category-drawer');
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await touch('touchend',122,223,'#category-drawer');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  // 開始範囲の両端（12px、96px）も有効。開いた後のcancelは開閉を取り消さない。
  for (const x of [12,96]) {
    await touch('touchstart',x,210);
    await touch('touchmove',x+64,216);
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await touch('touchcancel',x+64,216);
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded','false');
  }
  // touchendのみで閾値に達しても開かない。
  await touch('touchstart',48,210);
  await touch('touchend',138,216);
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  // ボタン・Escape・背景クリックも維持。ページ全体で横パンを禁止しない。
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).overscrollBehaviorX)).toBe('auto');
  expect(await page.locator('#main-content').evaluate(el => getComputedStyle(el).touchAction)).toBe('auto');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded','false');
  await trigger.click();
  await page.locator('#drawer-backdrop').click({position:{x:350,y:300}});
  await expect(trigger).toHaveAttribute('aria-expanded','false');
});

// タッチ端末だけに表示する初回スワイプ案内の回帰検証。
test.describe('スマホのスワイプガイド', () => {
  test.use({ viewport: {width:390,height:844}, hasTouch:true, isMobile:true });
  test('操作の邪魔をせず、初回の成功したスワイプで消え、再訪時も表示しない', async ({ page }) => {
    await page.addInitScript(() => {
      // 旧ガイドを完了したブラウザでも変更版を一度だけ案内する。
      localStorage.setItem('yurulink-swipe-guide-completed-v1','1');
      sessionStorage.setItem('yurulink-swipe-guide-animated-v1','1');
      document.addEventListener('animationstart', e => {
        if (e.animationName !== 'swipe-guide-nudge') return;
        const style = getComputedStyle(e.target);
        window.swipeGuideAnimation = {duration:style.animationDuration, iterations:style.animationIterationCount};
      });
    });
    await page.goto('/', { waitUntil:'domcontentloaded' });
    const guide = page.locator('#swipe-guide');
    const trigger = page.locator('#open-categories');
    await expect(guide).toBeVisible();
    await expect(guide).toHaveAttribute('aria-hidden','true');
    await expect(guide).toHaveCSS('pointer-events','none');
    await expect.poll(() => page.evaluate(() => window.swipeGuideAnimation)).toEqual({duration:'1.3s',iterations:'3'});
    await expect(guide).not.toHaveClass(/swipe-guide--animate/, {timeout:6000});
    await expect(guide).toBeVisible();
    const geometry = await guide.evaluate(el => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left+4,r.top+20);
      return {left:r.left, right:r.right, height:r.height, barWidth:getComputedStyle(el,'::before').flexBasis, blocks:el.contains(hit)};
    });
    expect(geometry).toEqual({left:12,right:68,height:132,barWidth:'14px',blocks:false});
    const color = await guide.evaluate(el => getComputedStyle(el).color);
    await page.locator('#theme-toggle').click();
    expect(await guide.evaluate(el => getComputedStyle(el).color)).not.toBe(color);
    // タップで開く間は非表示。スワイプ未習得のまま閉じると静止ガイドを再表示する。
    await trigger.click();
    await expect(guide).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(guide).toBeVisible();
    await expect(guide).not.toHaveClass(/swipe-guide--animate/);
    await page.evaluate(() => {
      function dispatch(type, x, y){
        const event = new Event(type,{bubbles:true,cancelable:true});
        Object.defineProperty(event,'touches',{value:type==='touchend'?[]:[{clientX:x,clientY:y}]});
        Object.defineProperty(event,'changedTouches',{value:[{clientX:x,clientY:y}]});
        document.getElementById('main-content').dispatchEvent(event);
      }
      dispatch('touchstart',12,300);
      dispatch('touchmove',75,302); // 63pxは閾値未満
      dispatch('touchend',75,302);
    });
    await expect(trigger).toHaveAttribute('aria-expanded','false');
    await expect(guide).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('yurulink-swipe-guide-completed-v2'))).toBeNull();
    await guide.evaluate(() => {
      const node = document.getElementById('main-content');
      for (const [type,x] of [['touchstart',12],['touchmove',76]]) {
        const event = new Event(type,{bubbles:true,cancelable:true});
        Object.defineProperty(event,'touches',{value:[{clientX:x,clientY:300}]});
        Object.defineProperty(event,'changedTouches',{value:[{clientX:x,clientY:300}]});
        node.dispatchEvent(event);
      }
    });
    await expect(trigger).toHaveAttribute('aria-expanded','true');
    await expect(guide).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('yurulink-swipe-guide-completed-v2'))).toBe('1');
    await page.keyboard.press('Escape');
    await expect(guide).toBeHidden();
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(guide).toBeHidden();
  });
  test('視差・アニメーション軽減設定では静止し、デスクトップ幅では表示しない', async ({ page }) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/', {waitUntil:'domcontentloaded'});
    const guide = page.locator('#swipe-guide');
    await expect(guide).toBeVisible();
    await expect(guide.locator('svg')).toHaveCSS('animation-name','none');
    await page.screenshot({path:'test-results/evidence/swipe-guide-mobile.png'});
    await page.setViewportSize({width:1280,height:800});
    await expect(guide).toBeHidden();
    await page.setViewportSize({width:390,height:844});
    await expect(guide).toBeVisible();
    await expect(guide.locator('svg')).toHaveCSS('animation-name','none');
  });
});
