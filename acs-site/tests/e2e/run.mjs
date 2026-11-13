// End-to-end checks against the built site, served by `vite preview`.
// Plain Node on purpose: Playwright is pre-installed globally in the build
// container and must not be re-installed per project.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'test-results');
const screens = join(out, 'screens');
mkdirSync(screens, { recursive: true });

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const report = JSON.parse(readFileSync(join(root, 'dist', 'build-report.json'), 'utf8'));
const ROUTES = report.routes;
const PRODUCT_ROUTES = ROUTES.filter((r) => /^\/products\/[^/]+\/$/.test(r));
const WIDTHS = [360, 1280];
// One of each page type is enough for screenshots and axe; overflow runs on every route.
const SAMPLE = ['/', '/products/', '/products/1950g/', '/products/tc22/', '/basket/', '/enquiry/', '/company/', '/status/'];
const PII = { name: 'สมชาย ทดสอบระบบ', phone: '081-555-0142', company: 'บริษัท ทดสอบอีทูอี จำกัด', email: 'e2e-check@example.com', message: 'ข้อความทดสอบลับเฉพาะ' };

const checks = [];
const check = (id, name, pass, detail = '') => {
  checks.push({ id, name, pass: Boolean(pass), detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}${pass || !detail ? '' : `  — ${detail}`}`);
};

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: root, detached: true, stdio: 'ignore',
});
const stopServer = () => { try { process.kill(-server.pid); } catch { /* already gone */ } };
process.on('exit', stopServer);

let browser;
const axeResults = [];
try {
  await waitForServer();
  browser = await chromium.launch();

  /* ---------- routes: reachable, one h1, demo badge, closed to crawlers ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const h1s = new Map();
    const bad = [];
    for (const route of ROUTES) {
      const res = await page.goto(BASE + route, { waitUntil: 'load' });
      const h1 = await page.locator('h1').allTextContents();
      const title = await page.title();
      const badge = await page.locator('[data-system-status]').getAttribute('data-system-status');
      const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
      if (res.status() !== 200 || h1.length !== 1 || !title.trim() || badge !== report.system || (!report.indexable && robots !== 'noindex,nofollow')) {
        bad.push(`${route} status=${res.status()} h1=${h1.length} badge=${badge} robots=${robots}`);
      }
      h1s.set(route, h1[0] ?? '');
    }
    check('E01', `all ${ROUTES.length} routes return 200 with exactly one h1 and a title`, bad.length === 0, bad.join(' | '));
    const productH1 = PRODUCT_ROUTES.map((r) => h1s.get(r));
    check('E02', '14 product routes with 14 distinct h1', PRODUCT_ROUTES.length === 14 && new Set(productH1).size === 14, `${PRODUCT_ROUTES.length} routes, ${new Set(productH1).size} distinct`);

    const missing = await page.goto(`${BASE}/products/does-not-exist/`);
    check('E03', 'an unknown product returns 404, not a soft 200', missing.status() === 404, `status ${missing.status()}`);
    const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
    check('E04', 'robots.txt closes a non-live build to crawlers', report.indexable || /Disallow: \/\s*$/m.test(robotsTxt), robotsTxt.replace(/\n/g, ' '));

    /* ---------- internal links ---------- */
    const seen = new Set();
    const dead = [];
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const href of hrefs) {
        if (!href || !href.startsWith('/')) continue;
        const path = href.split('#')[0];
        if (seen.has(path)) continue;
        seen.add(path);
        const r = await fetch(BASE + path, { redirect: 'manual' });
        if (r.status !== 200) dead.push(`${path} → ${r.status} (from ${route})`);
      }
    }
    check('E05', `no internal link is dead (${seen.size} distinct targets)`, dead.length === 0, dead.join(' | '));

    // No page may link to an asiancoding.com URL: every one in the source data returns 404.
    const acsLinks = [];
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const n = await page.locator('a[href*="asiancoding.com/"]').count();
      if (n) acsLinks.push(`${route} (${n})`);
    }
    check('E06', 'no page links to a dead asiancoding.com URL from the catalogue data', acsLinks.length === 0, acsLinks.join(' | '));
    await ctx.close();
  }

  /* ---------- product text without JavaScript ---------- */
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/products/te200/`);
    const h1 = await page.locator('h1').textContent();
    const body = await page.locator('main').textContent();
    check('E07', 'product page text is in the HTML with JavaScript disabled', h1 === 'เครื่องพิมพ์ฉลากแบบตั้งโต๊ะ' && body.includes('TE200 Desktop Printer') && body.includes('Thermal-transfer label printing'), h1);
    await page.goto(`${BASE}/products/`);
    const cards = await page.locator('[data-product-card]:visible').count();
    check('E08', 'catalogue lists all 14 products with JavaScript disabled', cards === 14, `${cards} cards`);
    await page.goto(`${BASE}/products/1950g/`);
    const text = await page.locator('main').textContent();
    check('E09', 'unsourced spec figures are omitted and the page says how many', !text.includes('IP52') && !text.includes('0–50') && (await page.locator('[data-omitted-figures="2"]').count()) === 1);
    await ctx.close();
  }

  /* ---------- catalogue filter and search ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/products/`);
    const visible = () => page.locator('[data-product-card]:visible').count();
    await page.click('[data-filter="scanners"]');
    const scanners = await visible();
    await page.click('[data-filter="all"]');
    await page.fill('#catalogue-search', 'TE 200');
    const model = await visible();
    await page.fill('#catalogue-search', 'ริบบอน');
    const thai = await visible();
    await page.fill('#catalogue-search', 'zzzz-no-such');
    const none = await visible();
    const emptyShown = await page.locator('#catalogue-empty').isVisible();
    check('E10', 'catalogue filter and search narrow the list (scanners 4, "TE 200" 1, ริบบอน 3, nonsense 0)', scanners === 4 && model === 1 && thai === 3 && none === 0 && emptyShown, `${scanners}/${model}/${thai}/${none}`);
    await page.goto(`${BASE}/products/?category=printers`);
    check('E11', 'a category link from the home page pre-selects the filter', (await visible()) === 4 && (await page.locator('[data-filter="printers"]').getAttribute('aria-pressed')) === 'true');
    await ctx.close();
  }

  /* ---------- basket, enquiry, store boundary, PII ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const requests = [];
    page.on('request', (r) => requests.push(`${r.method()} ${r.url()}`));

    await page.goto(`${BASE}/products/te200/`);
    await page.click('[data-add-to-basket]');
    await page.goto(`${BASE}/basket/`);
    const items = await page.locator('#basket-list li').count();
    check('E12', 'a product added on its page appears in the basket', items === 1, `${items} item(s)`);

    await page.goto(`${BASE}/enquiry/`);
    const consent = await page.evaluate(() => [document.querySelector('#f-serviceConsent').checked, document.querySelector('#f-marketingConsent').checked]);
    check('E13', 'both consent boxes start unticked', consent[0] === false && consent[1] === false, JSON.stringify(consent));
    check('E14', 'the enquiry carries the basket items over', (await page.locator('#basket-summary li').count()) === 1);

    await page.click('#next-step');
    const step1 = await page.evaluate(() => ['name', 'phone'].map((n) => {
      const input = document.querySelector(`[name="${n}"]`);
      const err = document.querySelector(`#err-${n}`);
      return !err.hidden && err.textContent.trim().length > 0 && err.getAttribute('role') === 'alert'
        && input.getAttribute('aria-invalid') === 'true' && input.getAttribute('aria-describedby').split(' ').includes(`err-${n}`);
    }));
    const stillStep1 = await page.locator('fieldset[data-step="1"]').isVisible();
    check('E15', 'an empty step is refused; each error is announced and tied to its field', step1.every(Boolean) && stillStep1, JSON.stringify(step1));

    await page.fill('#f-name', PII.name);
    await page.fill('#f-phone', PII.phone);
    await page.click('#next-step');
    const focusOnStep2 = await page.evaluate(() => document.activeElement?.id);
    await page.fill('#f-company', PII.company);
    await page.fill('#f-email', PII.email);
    await page.click('#next-step');
    await page.selectOption('#f-industry', 'retail');
    await page.selectOption('#f-businessScale', 'multi_site');
    await page.check('input[name="interests"][value="printers"]');
    await page.fill('#f-message', PII.message);
    check('E16', 'focus moves to the heading of the new step', focusOnStep2 === 'step-2-title', String(focusOnStep2));

    await page.click('#send-enquiry');
    const refused = await page.locator('#err-serviceConsent').isVisible();
    const resultHidden = await page.locator('#enquiry-result').isHidden();
    check('E17', 'submitting without service consent is refused', refused && resultHidden);

    await page.check('#f-serviceConsent');
    const marketing = await page.isChecked('#f-marketingConsent');
    await page.click('#send-enquiry');
    await page.waitForSelector('#enquiry-result:not([hidden])');
    const outcome = await page.locator('#enquiry-result').getAttribute('data-outcome');
    const message = await page.locator('#enquiry-result').textContent();
    const pageText = await page.locator('main').textContent();
    check('E18', 'marketing consent is not required to submit', marketing === false);
    check('E19', 'the store boundary refuses the write and the screen says so', outcome === 'not_connected' && message.includes('ยังไม่ได้ส่งคำขอ'), `${outcome}: ${message.slice(0, 60)}`);
    check('E20', 'no success message appears without a success', !/บันทึกคำขอแล้ว|ส่งคำขอสำเร็จ|เลขอ้างอิง|ขอบคุณ/.test(pageText));

    const storage = await page.evaluate(() => ({
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
      cookie: document.cookie,
    }));
    const dump = JSON.stringify(storage);
    const leaked = Object.values(PII).filter((v) => dump.includes(v) || page.url().includes(encodeURIComponent(v)) || page.url().includes(v));
    check('E21', 'after a filled form, storage, cookies and the URL hold nothing personal', leaked.length === 0 && Object.keys(storage.local).length === 0 && storage.cookie === '', dump);
    check('E22', 'the only stored key is the basket of product ids', JSON.stringify(Object.keys(storage.session)) === '["acs:basket:v1"]' && storage.session['acs:basket:v1'] === '["te200"]', dump);
    const outbound = requests.filter((r) => !r.includes(BASE));
    const writes = requests.filter((r) => !r.startsWith('GET '));
    check('E23', 'no request leaves the site and nothing is POSTed', outbound.length === 0 && writes.length === 0, [...outbound, ...writes].join(' | '));

    /* keyboard-only path through step 1 */
    await page.goto(`${BASE}/enquiry/`);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className);
    await page.focus('#f-name');
    await page.keyboard.type('ทดสอบคีย์บอร์ด');
    await page.keyboard.press('Tab');
    await page.keyboard.type('0812345678');
    await page.keyboard.press('Enter');
    const advanced = await page.locator('fieldset[data-step="2"]').isVisible();
    check('E24', 'skip link is the first focus stop, and Enter advances a step without submitting', first === 'skip-link' && advanced, `${first} / step2=${advanced}`);
    await ctx.close();
  }

  /* ---------- layout: overflow, screenshots, accessibility ---------- */
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const overflow = [];
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (extra > 0) overflow.push(`${route} +${extra}px`);
    }
    check(`E25-${width}`, `no horizontal page scroll at ${width}px on any of ${ROUTES.length} routes`, overflow.length === 0, overflow.join(' | '));

    const small = [];
    const violations = [];
    for (const route of SAMPLE) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      if (route === '/enquiry/') {
        // Reach step 3 so the longest part of the form is what gets checked.
        await page.fill('#f-name', 'ทดสอบ'); await page.fill('#f-phone', '0812345678'); await page.click('#next-step');
        await page.fill('#f-company', 'ทดสอบ'); await page.fill('#f-email', 'a@example.com'); await page.click('#next-step');
      }
      const name = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '-');
      await page.screenshot({ path: join(screens, `${name}-${width}.png`), fullPage: true });

      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
      const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      axeResults.push({ route, width, violations: result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) })) });
      for (const v of serious) violations.push(`${route} ${v.id} ×${v.nodes.length}`);

      const tiny = await page.evaluate(() => [...document.querySelectorAll('a, button, input, select, textarea')]
        .filter((el) => el.offsetParent !== null && !el.closest('p, li.card, .feature-list, .pending, .held, table') && !el.matches('.card-title a'))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ el, r }) => r.height < 44 && !(el.matches('input[type="checkbox"]') && el.closest('label')?.getBoundingClientRect().height >= 44))
        .map(({ el, r }) => `${el.tagName.toLowerCase()}.${el.className || el.id} ${Math.round(r.height)}px`));
      for (const t of tiny) small.push(`${route} ${t}`);
    }
    check(`E26-${width}`, `no serious or critical accessibility violation at ${width}px (${SAMPLE.length} page types)`, violations.length === 0, violations.join(' | '));
    check(`E27-${width}`, `standalone controls are at least 44px tall at ${width}px`, small.length === 0, [...new Set(small)].join(' | '));
    await ctx.close();
  }
} catch (error) {
  check('E00', 'e2e run completed', false, error?.stack ?? String(error));
} finally {
  await browser?.close();
  stopServer();
}

const failed = checks.filter((c) => !c.pass);
writeFileSync(join(out, 'e2e.json'), JSON.stringify({ ranAt: new Date().toISOString(), base: BASE, routes: ROUTES.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2) + '\n');
writeFileSync(join(out, 'axe.json'), JSON.stringify({ ranAt: new Date().toISOString(), tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'], pages: axeResults }, null, 2) + '\n');
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
