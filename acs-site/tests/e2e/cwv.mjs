// Lab measurement of Core Web Vitals on the built site.
//
// What this is: Chromium on a phone-sized viewport, CPU slowed 4x, network
// shaped to a slow 4G profile, against the local preview server.
// What this is not: field data. Real users, real devices and a real host will
// differ. It shows the pages are not slow by construction; it does not show
// they are fast in production.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'test-results');
mkdirSync(out, { recursive: true });

const TARGET = { lcpMs: 2500, cls: 0.1, inpMs: 200 };
const PROFILE = { cpuSlowdown: 4, latencyMs: 150, downloadKbps: 1600, uploadKbps: 750, viewport: { width: 360, height: 800 } };
const PAGES = ['/', '/products/', '/products/te200/', '/products/1950g/', '/enquiry/'];

const observe = () => {
  window.__cwv = { lcp: 0, cls: 0, events: [] };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__cwv.lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    // Summing every shift is at least as large as the real CLS, so it errs against us.
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cwv.cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__cwv.events.push({ name: entry.name, duration: entry.duration });
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
};

const rows = [];
let server;
let browser;
let error = '';
try {
  server = await startServer(root);
  browser = await chromium.launch();
  for (const route of PAGES) {
    const ctx = await browser.newContext({ viewport: PROFILE.viewport, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: PROFILE.latencyMs,
      downloadThroughput: (PROFILE.downloadKbps * 1000) / 8,
      uploadThroughput: (PROFILE.uploadKbps * 1000) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpuSlowdown });
    await page.addInitScript(observe);
    await page.goto(server.base + route, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // One representative interaction per page, so INP has something to measure.
    let interaction = 'none';
    if (route === '/products/') {
      await page.tap('[data-filter="scanners"]');
      await page.fill('#catalogue-search', 'DS');
      interaction = 'filter tap + search input';
    } else if (route === '/enquiry/') {
      await page.tap('#next-step');
      interaction = 'next step tap (shows validation errors)';
    } else if (route.startsWith('/products/')) {
      await page.tap('[data-add-to-basket]');
      interaction = 'add to basket tap';
    }
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => window.__cwv);
    const inp = m.events.length ? Math.max(...m.events.map((e) => e.duration)) : null;
    rows.push({
      route,
      lcpMs: Math.round(m.lcp),
      cls: Number(m.cls.toFixed(4)),
      interaction,
      // No event above the 16 ms reporting threshold means the interaction was faster than that.
      slowestInteractionMs: inp === null ? (interaction === 'none' ? null : '<16') : Math.round(inp),
      pass: m.lcp > 0 && m.lcp <= TARGET.lcpMs && m.cls <= TARGET.cls && (inp === null || inp <= TARGET.inpMs),
    });
    await ctx.close();
  }
} catch (e) {
  error = e?.stack ?? String(e);
} finally {
  await browser?.close();
  server?.stop();
}

for (const r of rows) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.route.padEnd(20)} LCP ${String(r.lcpMs).padStart(5)} ms   CLS ${r.cls}   interaction ${r.slowestInteractionMs ?? '-'} ms`);
}
if (error) console.log(`FAIL  ${error}`);
const failed = rows.filter((r) => !r.pass).length + (error ? 1 : 0);
writeFileSync(join(out, 'cwv.json'), JSON.stringify({
  ranAt: new Date().toISOString(),
  kind: 'lab measurement on a local preview server — not field data',
  profile: PROFILE,
  target: TARGET,
  caveats: [
    'Fallback fonts: web fonts are blocked in the build container, so font loading cost is not represented.',
    'Product images are placeholders, so image weight is not represented. Real images will raise LCP.',
    'The interaction figure is the slowest single event observed, an approximation of INP for one interaction.',
  ],
  passed: rows.filter((r) => r.pass).length,
  failed,
  error,
  pages: rows,
}, null, 2) + '\n');
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} pages within target (lab)`);
process.exit(failed ? 1 : 0);
