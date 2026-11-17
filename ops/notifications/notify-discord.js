'use strict';
const fs = require('node:fs');

async function main() {
  const code = process.env.YURULINK_EVENT_CODE;
  const status = process.env.YURULINK_EVENT_STATUS || 'unknown';
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  const config = JSON.parse(fs.readFileSync('ops/notifications/routes.json', 'utf8'));
  if (config.schema_version !== 1 || !config.events || !Object.hasOwn(config.events, code || '')) {
    throw new Error('Unknown notification event code');
  }
  const route = config.events[code];
  if (!route.enabled) {
    console.log('Discord notification disabled for event: ' + code);
    return;
  }
  if (!webhook) {
    console.log('Discord notification skipped: DISCORD_WEBHOOK_URL is not configured');
    return;
  }
  if (!route.thread_id) {
    console.log('Discord notification skipped: thread ID is not configured for ' + code);
    return;
  }
  if (!/^\\d{15,22}$/.test(String(route.thread_id))) throw new Error('Invalid Discord thread ID');
  const url = new URL(webhook);
  if (url.protocol !== 'https:' || !['discord.com', 'discordapp.com'].includes(url.hostname) ||
      !/^\\/api\\/webhooks\\/\\d+\\/[^/]+\\/?$/.test(url.pathname)) {
    throw new Error('Invalid Discord webhook URL');
  }
  url.searchParams.set('thread_id', String(route.thread_id));
  url.searchParams.set('wait', 'true');
  const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : 'ℹ️';
  const runUrl = [process.env.GITHUB_SERVER_URL, process.env.GITHUB_REPOSITORY,
    'actions/runs', process.env.GITHUB_RUN_ID].join('/');
  const content = icon + ' YuruLink ' + code + ' / ' + status + '\\n' + runUrl;
  const body = JSON.stringify({content, allowed_mentions:{parse:[]}});
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body, signal:AbortSignal.timeout(15000)
    });
    if (response.ok) {
      console.log('Discord notification delivered: HTTP ' + response.status);
      return;
    }
    if (response.status === 429 && attempt < 2) {
      const seconds = Number(response.headers.get('retry-after'));
      await new Promise(resolve => setTimeout(resolve, Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 10000) : 2000));
      continue;
    }
    throw new Error('Discord notification failed: HTTP ' + response.status);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
