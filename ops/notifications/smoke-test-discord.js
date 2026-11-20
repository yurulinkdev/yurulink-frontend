'use strict';

/**
 * Explicit, one-time connectivity test for the six Discord forum threads.
 * Does not import events, touch Google Sheets, or send real event notifications.
 */
const fs = require('node:fs');

const routes = JSON.parse(fs.readFileSync('ops/notifications/routes.json', 'utf8')).events;
const webhook = process.env.DISCORD_WEBHOOK_URL || '';
if (!webhook) throw Error('DISCORD_WEBHOOK_URL is not configured in this repository');

const base = new URL(webhook);
if (base.protocol !== 'https:' ||
    !['discord.com', 'discordapp.com'].includes(base.hostname) ||
    !/^\/api\/webhooks\/\d+\/[^/]+\/?$/.test(base.pathname) ||
    base.username || base.password || base.port) {
  throw Error('Invalid Discord webhook destination');
}

const entries = Object.entries(routes).sort((a, b) => a[1].order - b[1].order);
if (entries.length !== 6 || entries.some(([, route]) => !/^\d{15,22}$/.test(route.thread_id || ''))) {
  throw Error('Six valid thread IDs are required before the smoke test');
}
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : '(local execution)';
const timestamp = new Date().toISOString();
let failed = 0;

async function sendTest(code, route) {
  const url = new URL(base);
  url.searchParams.set('thread_id', route.thread_id);
  url.searchParams.set('wait', 'true');
  const content = [
    '🧪 **YuruLink 通知経路テスト（本番イベントではありません）**',
    `イベント: \`${code}\` / 通知番号: ${route.order}`,
    'これはWebhookとスレッド振り分けの確認です。実際のフォーム受付・審査・公開・デプロイは発生していません。',
    'メンション: なし',
    `実行: ${timestamp}`,
    runUrl
  ].join('\n');
  const body = JSON.stringify({ content, allowed_mentions: { parse: [] } });
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(20000)
    });
    if (response.status === 429 && attempt < 2) {
      const data = await response.json().catch(() => ({}));
      const seconds = Number(data.retry_after) || 2;
      await new Promise(resolve => setTimeout(resolve, Math.min(Math.max(seconds * 1000, 1000), 12000)));
      continue;
    }
    if (!response.ok) throw Error(`Discord HTTP ${response.status}`);
    const data = await response.json();
    if (String(data.channel_id) !== route.thread_id || !/^\d+$/.test(String(data.id || ''))) {
      throw Error('Discord returned a message in an unexpected channel');
    }
    console.log(`PASS ${route.order} ${code} -> thread ${route.thread_id}, message ${data.id}`);
    return;
  }
}

(async () => {
  for (const [code, route] of entries) {
    try {
      await sendTest(code, route);
    } catch (error) {
      failed++;
      console.error(`FAIL ${route.order} ${code}: ${error.message}`);
    }
    // Keep below typical Discord Webhook rate limits.
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  console.log(`Discord thread smoke test: ${entries.length - failed}/${entries.length} successful`);
  if (failed) process.exitCode = 1;
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
