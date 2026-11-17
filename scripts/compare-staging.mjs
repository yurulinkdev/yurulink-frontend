import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const targets = {
  legacy: 'https://yurulink-frontend-staging.pages.dev/',
  preview: 'https://staging.yurulink-frontend.pages.dev/'
};
const browser = await chromium.launch({headless:true});
const report = {};
for (const [name,url] of Object.entries(targets)) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    const response = await page.goto(url, {waitUntil:'networkidle',timeout:60000});
    report[name] = await page.evaluate(() => ({
      title: document.title,
      catalogItems: document.querySelectorAll('[data-catalog-item]').length,
      visibleItems: [...document.querySelectorAll('[data-catalog-item]')].filter(x => !x.hidden).length,
      categoryLinks: document.querySelectorAll('[data-category-id], [data-category-order]').length,
      pagination: !!document.querySelector('#pagination'),
      topPagination: !!document.querySelector('#pagination-top'),
      sortControls: document.querySelectorAll('select[id*=sort], [data-sort]').length,
      pageSize: !!document.querySelector('#page-size'),
      scripts: [...document.scripts].map(x=>x.getAttribute('src')).filter(Boolean),
      stylesheet: [...document.querySelectorAll('link[rel=stylesheet]')].map(x=>x.href),
      headings: [...document.querySelectorAll('h1,h2')].map(x=>x.textContent.trim()).slice(0,12)
    }));
    report[name].status=response?.status();
    report[name].errors=errors;
    await page.screenshot({path:'comparison-'+name+'.png',fullPage:true});
  } catch(e) {report[name]={error:String(e)};}
  await page.close();
}
await browser.close();
writeFileSync('comparison-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (Object.values(report).some(x=>x.error || x.status!==200)) process.exitCode=1;

// Compare both publicly accessible environments after deployment.
