import { test, expect } from '@playwright/test';

// Cloudflare Pages公開URLで、OGPメタデータと画像実体の一致を検査する。
test('ブランチ別OGPが正しい画像を参照する', async ({ page, request }) => {
  await page.goto('/');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  const twitter = await page.locator('meta[name="twitter:image"]').getAttribute('content');
  const alt = await page.locator('meta[property="og:image:alt"]').getAttribute('content');
  expect(image).toBeTruthy();
  expect(twitter).toBe(image);
  const host = new URL(page.url()).hostname;
  const inPreview = host.startsWith('staging.') || host.endsWith('.yurulink-frontend.pages.dev');
  if (inPreview) {
    expect(image).toContain('/ogp/yurulink-staging.png');
    expect(alt).toContain('STAGING');
  } else if (host === 'yurulink-frontend.pages.dev' || host === 'www.yurulink.com') {
    expect(image).toContain('/ogp/yurulink-light.png');
    expect(alt).not.toContain('STAGING');
  }
  const res = await request.get(image);
  expect(res.ok()).toBeTruthy();
  expect(res.headers()['content-type']).toContain('image/png');
  const bytes = await res.body();
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
});
