'use strict';
const fs = require('node:fs');
const routes = JSON.parse(fs.readFileSync('ops/notifications/routes.json','utf8'));
if (routes.schema_version !== 1 || routes.webhook_secret !== 'DISCORD_WEBHOOK_URL') throw Error('Invalid schema');
const entries = Object.entries(routes.events || {});
if (!entries.length) throw Error('Empty event catalog');
const orders = new Set();
let previous = -1;
for (const [code, route] of entries) {
  if (!/^[a-z]+(?:[.-][a-z]+)*$/.test(code)) throw Error('Invalid event code: ' + code);
  if (!Number.isSafeInteger(route.order) || route.order <= 0 || orders.has(route.order)) throw Error('Invalid or duplicate order: ' + code);
  if (route.order <= previous) throw Error('Events must be ordered by ascending order: ' + code);
  if (typeof route.enabled !== 'boolean' || typeof route.description !== 'string') throw Error('Invalid route: ' + code);
  if (route.thread_id !== null && !/^\d{15,22}$/.test(String(route.thread_id))) throw Error('Invalid thread ID: ' + code);
  orders.add(route.order);
  previous = route.order;
}
console.log('Notification routes validated: ' + entries.length + ' events');
