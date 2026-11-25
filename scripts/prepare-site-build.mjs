// Cloudflare Pagesの既存「npm run css:build && hugo --minify」を維持する。
// Hugoの既定production環境に選択済みの設定を生成する。追跡対象は変更しない。
import {copyFileSync, mkdirSync} from 'node:fs';
const forced = process.env.YURULINK_SITE_TARGET || '';
if (forced && !['production','staging'].includes(forced)) {
  throw new Error('YURULINK_SITE_TARGET must be production or staging');
}
const pagesBranch = process.env.CF_PAGES_BRANCH || '';
const branch = pagesBranch || process.env.GITHUB_REF_NAME || '';
const detected = branch === 'main' ? 'production' : 'staging';
if (pagesBranch && forced && forced !== detected) {
  throw new Error('YURULINK_SITE_TARGET conflicts with CF_PAGES_BRANCH');
}
const target = forced || detected;
const source = target === 'production' ? 'main' : 'staging';
mkdirSync('config/production', {recursive:true});
copyFileSync('config/'+source+'/hugo.toml','config/production/hugo.toml');
console.log('YURULINK_BUILD_TARGET='+target+' BRANCH='+(branch||'(unset)')+' CONFIG='+source);
