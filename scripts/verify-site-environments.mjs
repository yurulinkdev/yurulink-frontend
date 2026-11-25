// Validate both build targets using the exact existing Pages build command.
// 追跡済みの設定を変更せず、既存PagesコマンドとHugo標準環境を両方検査する。
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
function html(p){return readFileSync('public/'+p+'/index.html','utf8');}
function assert(condition, message){if (!condition) throw new Error(message);}
function build(target, native=false){
  const env={...process.env,YURULINK_SITE_TARGET:target,CF_PAGES_BRANCH:target==='production'?'main':'staging'};
  const r=native ? spawnSync('hugo',['--minify','--environment',target==='production'?'main':'staging'],{env,stdio:'inherit'}) : spawnSync('npm',['run','build'],{env,stdio:'inherit'});
  if (r.status !== 0) throw new Error(target+' build failed: '+r.status);
  const root=html('');
  const catalog=html('catalog');
  const submit=html('submit');
  const url=target==='production'?'https://www.yurulink.com/':'https://staging.yurulink.com/';
  const canonical = doc => doc.match(/<link\b[^>]*\brel=(?:"canonical"|canonical)[^>]*>/i)?.[0] || '';
  const ogImage = doc => doc.match(/<meta\b[^>]*\bproperty=(?:"og:image"|og:image)[^>]*>/i)?.[0] || '';
  assert(canonical(root).includes(url),target+' canonical mismatch: '+canonical(root));
  assert(ogImage(root).includes(url+'ogp/yurulink-'+(target==='production'?'light':'staging')+'.png'),target+' OGP URL mismatch: '+ogImage(root));
  assert(root.includes('G-8Y659Y3Y8Y')===(target==='production'),target+' GA4 ID mismatch');
  assert(/\bid=(?:"analytics-consent"|analytics-consent)(?:\s|>)/i.test(root)===(target==='production'),target+' GA4 consent state mismatch');
  if(target==='production') assert(/\bdata-allowed-hostnames=(?:"www\.yurulink\.com"|www\.yurulink\.com)(?:\s|>)/i.test(root), 'GA4 host mismatch');
  assert(canonical(catalog).includes(url+'catalog/'),target+' catalog canonical mismatch: '+canonical(catalog));
  const noindex=/<meta\b[^>]*\bname=(?:"robots"|robots)[^>]*noindex/i.test(root);
  assert(noindex===(target!=='production'),target+' noindex mismatch');
  const form=/<iframe\b[^>]*\bid=(?:"submission-form-frame"|submission-form-frame)/i.test(submit);
  assert(form===(target!=='production'),target+' submission iframe state mismatch');
  if(target==='production')assert(!/<a\b[^>]*\bid=(?:"submission-external-link"|submission-external-link)/i.test(submit),'Production exposes unvalidated form');
  assert(root.includes('welcome-catalog-link'),'Welcome entry missing');
  assert(!/<[^>]+\bid=(?:"catalog"|catalog)(?:\s|>)/i.test(root),'Welcome includes catalog unexpectedly');
  console.log('SITE_RELEASE_BUILD_OK '+JSON.stringify({target,canonical:url,noindex,form}));
}
build('production');
build('staging');
build('production',true);
build('staging',true);

const tracked=spawnSync('git',['diff','--exit-code','--','config/_default','config/main','config/staging'],{stdio:'inherit'});
assert(tracked.status===0,'ビルドが追跡済み環境設定を変更した');
