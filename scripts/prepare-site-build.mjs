/**
 * Resolve the actual Cloudflare Pages build branch before Hugo runs.
 * Pages currently executes "npm run css:build && hugo --minify", so this
 * preflight is invoked by css:build (not only by npm run build).
 *
 * This file does not touch DNS, Cloudflare project settings, or the repo on
 * GitHub. It edits only the checked-out hugo.toml in the build workspace.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const forced = process.env.YURULINK_SITE_TARGET || '';
if (forced && !['production','staging'].includes(forced)) {
  throw new Error('YURULINK_SITE_TARGET must be production or staging');
}
const branch = process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || '';
const target = forced || (branch === 'main' ? 'production' : 'staging');
const production = target === 'production';
const url = production
  ? 'https://www.yurulink.com/'
  : 'https://staging.yurulink.com/';

const file = resolve('hugo.toml');
let src = readFileSync(file, 'utf8');
function replaceUnique(pattern, next, label) {
  const matches = [...src.matchAll(new RegExp(pattern.source, 'gm'))];
  if (matches.length !== 1) throw new Error('Expected exactly one ' + label + ', found ' + matches.length);
  src = src.replace(new RegExp(pattern.source, 'm'), next);
}
replaceUnique(/^baseURL\s*=\s*"[^"]*"\s*$/, 'baseURL = "'+url+'"', 'baseURL');
replaceUnique(/^noindex\s*=\s*(?:true|false)\s*$/, 'noindex = '+String(!production), 'noindex');
const start = src.indexOf('[params.submission]');
const end = src.indexOf('\n[', start + 1);
if (start < 0) throw new Error('Missing [params.submission]');
let block = src.slice(start, end === -1 ? src.length : end);
for (const name of ['enabled','embed_enabled']) {
  const re = new RegExp('^'+name+'\\s*=\\s*(?:true|false)\\s*$','gm');
  if ([...block.matchAll(re)].length !== 1) throw new Error('Expected submission '+name);
  block = block.replace(new RegExp('^'+name+'\\s*=\\s*(?:true|false)\\s*$','m'), name+' = '+String(!production));
}
src = src.slice(0,start) + block + src.slice(end === -1 ? src.length : end);
writeFileSync(file, src);
console.log('YURULINK_BUILD_TARGET='+target+' BRANCH='+(branch||'(unset)')+' BASE_URL='+url+' NOINDEX='+String(!production)+' SUBMISSION_ENABLED='+String(!production));
