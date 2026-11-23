// Validate both build targets using the exact existing Pages build command.
// All mutations occur in the ephemeral build checkout; restore hugo.toml.
import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const original = readFileSync('hugo.toml','utf8');
function html(p){return readFileSync('public/'+p+'/index.html','utf8');}
function assert(condition, message){if (!condition) throw new Error(message);}
function build(target){
  const r=spawnSync('npm',['run','build'],{env:{...process.env,YURULINK_SITE_TARGET:target,CF_PAGES_BRANCH:target==='production'?'main':'staging'},stdio:'inherit'});
  if (r.status !== 0) throw new Error(target+' build failed: '+r.status);
  const root=html('');
  const catalog=html('catalog');
  const submit=html('submit');
  const url=target==='production'?'https://www.yurulink.com/':'https://staging.yurulink.com/';
  const canonical = doc => doc.match(/<link\b[^>]*\brel=(?:"canonical"|canonical)[^>]*>/i)?.[0] || '';
  const ogImage = doc => doc.match(/<meta\b[^>]*\bproperty=(?:"og:image"|og:image)[^>]*>/i)?.[0] || '';
  assert(canonical(root).includes(url),target+' canonical mismatch: '+canonical(root));
  assert(ogImage(root).includes(url),target+' OGP URL mismatch: '+ogImage(root));
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
try {build('production');build('staging');}
finally{writeFileSync('hugo.toml',original);}
