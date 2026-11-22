// Tests of interactive catalog features wait for async catalog data before asserting.
// Other routes and deliberate loading-shell tests retain the original navigation timing.
export async function gotoAndWaitForCatalog(page, url, options) {
  const response = await page.goto(url, options);
  if (new URL(page.url()).pathname === '/catalog/' && response?.status() === 200) {
    await page.locator('#catalog.catalog-ready').waitFor({state:'attached',timeout:30000});
  }
  return response;
}
