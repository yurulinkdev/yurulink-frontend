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
  const url=target==='production'?'https://yurulink-frontend.pages.dev/':'https://staging.yurulink-frontend.pages.dev/';
  assert(root.includes('rel="canonical" href="'+url+'"'),target+' canonical mismatch');
  assert(root.includes('property="og:image" content="'+url),target+' OGP URL mismatch');
  assert(catalog.includes('rel="canonical" href="'+url+'catalog/'),target+' catalog canonical mismatch');
  const noindex=/<meta name="robots" content="noindex, nofollow">/.test(root);
  assert(noindex===(target!=='production'),target+' noindex mismatch');
  const form=submit.includes('id="submission-form-frame"');
  assert(form===(target!=='production'),target+' submission iframe state mismatch');
  if(target==='production')assert(!submit.includes('id="submission-external-link"'),'Production exposes unvalidated form');
  assert(root.includes('id="welcome-catalog-link"'),'Welcome entry missing');
  assert(!root.includes('id="catalog"'),'Welcome includes catalog unexpectedly');
  console.log('SITE_RELEASE_BUILD_OK '+JSON.stringify({target,canonical:url,noindex,form}));
}
try {build('production');build('staging');}
finally{writeFileSync('hugo.toml',original);}
