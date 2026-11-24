import { test, expect } from '@playwright/test';

const hint = '#onboarding-hint';
const key = 'yurulink-first-visit-hint-v1';

test('desktop first visit: visible category speech bubble, dismissal and persistence', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/');
  const guide = page.locator(hint);
  const target = page.locator('#categories-intro-anchor');
  await expect(guide).toBeVisible();
  await expect(guide.locator('p')).toHaveText('カテゴリから番組や種類を選べます');
  await expect(target).toHaveClass(/onboarding-highlight/);
  await expect(target).toHaveAttribute('aria-describedby', 'onboarding-hint');
  const a = await target.boundingBox(), b = await guide.boundingBox();
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
  expect(b.height).toBeGreaterThan(25);
  expect(b.x + b.width).toBeLessThanOrEqual(272);
  await expect(guide).toHaveCSS('color', await page.locator('body').evaluate(e => getComputedStyle(e).color));
  await guide.getByRole('button', {name:'案内を閉じる'}).click();
  await expect(guide).toHaveCount(0);
  await expect(target).not.toHaveClass(/onboarding-highlight/);
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe('1');
  await page.reload();
  await expect(guide).toHaveCount(0);
});

for (const width of [320, 390, 768]) {
  test(`mobile first visit: compact in-flow guide at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await page.goto('/');
    const guide = page.locator(hint);
    const target = page.locator('#open-categories');
    await expect(guide).toBeVisible();
    await expect(guide.locator('p')).toHaveText('メニューはこちら');
    await expect(target).toHaveClass(/onboarding-highlight/);
    const a = await target.boundingBox(), b = await guide.boundingBox();
    const header = await page.locator('main > header').boundingBox();
    const heading = await page.locator('#welcome-heading').boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
    expect(b.x + b.width).toBeLessThanOrEqual(width);
    expect(b.y + b.height).toBeLessThanOrEqual(header.y + header.height);
    expect(b.y + b.height).toBeLessThan(heading.y);
    await target.click();
    await expect(guide).toHaveCount(0);
    await expect(target).toHaveAttribute('aria-expanded','true');
    await page.locator('#close-categories').click();
    await page.reload();
    await expect(guide).toHaveCount(0);
  });
}

for (const os of ['light','dark']) {
  test(`SNS icons follow explicit site theme even when OS is ${os}`, async ({page}) => {
    await page.setViewportSize({width:1440,height:900});
    await page.emulateMedia({colorScheme:os});
    await page.goto('/about/');
    const guide = page.locator(hint);
    if (await guide.count()) await guide.getByRole('button',{name:'案内を閉じる'}).click();
    const x = page.locator('img.social-platform-icon[src$="/x.svg"]').first();
    await expect(x).toBeVisible();
    // All eight stored SVGs must load and use the same theme CSS, including unconfigured accounts.
    await page.evaluate(() => {
      const row = document.createElement('div');
      row.id = 'test-social-icons';
      for (const key of ['x','instagram','youtube','bluesky','threads','discord','tiktok','facebook']) {
        const img = document.createElement('img');
        img.src = new URL('icons/social/'+key+'.svg', document.baseURI.split('/about/')[0]+'/').href;
        img.className = 'social-platform-icon';
        img.width = 24; img.height = 24;
        row.append(img);
      }
      document.querySelector('main').append(row);
    });
    const icons = page.locator('#test-social-icons img');
    await expect(icons).toHaveCount(8);
    await expect.poll(() => icons.evaluateAll(es=>es.every(e=>e.complete && e.naturalWidth>0))).toBe(true);
    const check = async theme => {
      if (await page.locator('html').getAttribute('data-theme') !== theme)
        await page.locator('#theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      await expect(x).toHaveCSS('filter',theme==='dark'?'invert(1)':'none');
      for (const img of await icons.all())
        await expect(img).toHaveCSS('filter',theme==='dark'?'invert(1)':'none');
    };
    await check('light');
    await check('dark');
    await page.locator('#theme-auto').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme',os);
  });
}
