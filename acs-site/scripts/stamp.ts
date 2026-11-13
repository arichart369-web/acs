/**
 * Re-stamps src/data/page-versions.json.
 *
 * Run it after changing page content, and commit the result. Pages whose
 * <main> is unchanged keep their `lastmod`; changed or new pages take this
 * run's timestamp. The manifest tracks the LIVE variant's indexable pages,
 * since those are the ones a sitemap would list.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSite } from '../src/build/site';
import { nextVersions, type Versions } from '../src/build/versions';
import { statusConfig, type StatusConfig } from '../src/config/status';
import { evidenceRecords } from '../src/data/evidence';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'page-versions.json');
const previous = JSON.parse(readFileSync(file, 'utf8')) as Versions;
const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const live: StatusConfig = { system: 'live', features: { ...statusConfig.features } };
const site = renderSite(live, evidenceRecords, now.slice(0, 10));
const pages = site.pages
  .filter((p) => p.indexable)
  .map((p) => ({ route: p.route, html: site.files.get(p.file) ?? '' }));

const next = nextVersions(previous, pages, now);
const changed = Object.keys(next).filter((route) => previous[route]?.hash !== next[route]?.hash);
const dropped = Object.keys(previous).filter((route) => !(route in next));
writeFileSync(file, JSON.stringify(next, null, 2) + '\n');

console.log(`stamped ${Object.keys(next).length} pages at ${now}`);
console.log(changed.length ? `changed or new: ${changed.join(' ')}` : 'no page content changed');
if (dropped.length) console.log(`no longer indexable: ${dropped.join(' ')}`);
