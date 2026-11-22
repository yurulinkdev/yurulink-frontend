import { test, expect } from '@playwright/test';
import { gotoAndWaitForCatalog } from './catalog-test-helpers.mjs';

test('リンク投稿ページを埋め込み、既存フォームへの外部導線も残す', async ({ page }) => {
  await gotoAndWaitForCatalog(page,'/submit/');
  await expect(page.getByRole('heading', { name: 'リンクを投稿する', exact: true })).toBeVisible();
  const form = page.locator('#submission-form-frame');
  await expect(form).toHaveAttribute('title', 'YuruLink リンク投稿 Googleフォーム');
  await expect(form).toHaveAttribute('src',
    'https://docs.google.com/forms/d/e/1FAIpQLSdEPu603sKgCEiwwlvTFrvIjuV10dvtaRE6WlRHJPCfWQps-g/viewform?embedded=true');
  await expect(page.locator('#submission-external-link')).toHaveAttribute(
    'href', 'https://forms.gle/hgYcATGs2oHEbf9v9');
  await expect(page.locator('#submission-external-link')).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText('送信しただけではYuruLinkには掲載されません')).toBeVisible();
  // フォームの中身・送信・収集先はGoogle側。テストで勝手な投稿を行わない。
});

test('スマホのナビゲーションから投稿ページへ遷移できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWaitForCatalog(page,'/catalog/');
  await page.locator('#open-categories').click();
  const link = page.locator('#contribution-link');
  await expect(link).toHaveAttribute('href', '/submit/');
  await link.click();
  await expect(page).toHaveURL(/\/submit\/$/);
  await expect(page.locator('#submission-form-frame')).toHaveAttribute('loading','lazy');
});
