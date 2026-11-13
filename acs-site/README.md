# ACS website rebuild

A rebuild of asiancoding.com as a tested static site. **It runs in demo mode and is not
deployed anywhere.** Nothing here touches the live domain, DNS or traffic; go-live is a
separate Owner decision with its own gate (backup, rollback plan, explicit approval).

PRD: https://claude.ai/artifact/YXVU5Vr7byRo78XAD1rino

## Run it

```sh
npm install
npm run build      # renders dist/ and writes dist/build-report.json
npm test           # unit tests (Vitest) → test-results/unit.json
npm run e2e        # Playwright + axe against `vite preview` → test-results/
npm run claims     # ACS claim scanner over the built HTML
npm run preview    # serve dist/ on http://127.0.0.1:4173
```

`npm run e2e` expects Playwright to be installed globally (it is in the build container).
Do not add it as a project dependency.

## Increments

| # | What | Unit | E2E | Claims |
|---|---|---|---|---|
| M0 | Skeleton: 20 pages reachable in demo mode, one status config, store boundary, evidence gate, enquiry wizard, basket | 82/82 | 30/30 | BLOCKED 0 |

## Non-negotiables, and where each one lives

| Rule | File |
|---|---|
| One place says live / demo / not connected | `src/config/status.ts` |
| Every write is refused until a backend passes its gate | `src/data/store.ts` |
| A spec figure renders only under an active evidence record | `src/rules/evidence.ts`, `src/rules/figures.ts` |
| Evidence goes draft → active only if the source quotes every figure, a source is named, and approver ≠ author; decisions are append-only | `src/rules/evidence.ts` |
| Nothing personal in URLs, storage, cookies or logs | `src/client/main.ts` (state in memory), checked by E21–E23 |
| A build that is not live is closed to crawlers | `isIndexable()` in `src/config/status.ts` |
| Catalogue data is a verbatim snapshot, never edited to fit | `src/data/catalog.source.json` |

## Status rules

`system` is `demo`. A feature moves to `live` only when its acceptance test passes **and**
the material behind it is named. Four features cannot move until the Owner supplies
something: spec figures (datasheets), prices (a dated price list), stock (dated stock
data) and the company page (its URL, decision D-11).

## Limits right now

- **Demo mode.** The enquiry form validates and then refuses to submit; nothing is stored
  or sent anywhere. The basket keeps product ids in `sessionStorage` and nothing else.
- **No evidence records.** Zero are active, so 7 figure lines across 5 products are
  omitted. `dist/build-report.json` lists each one.
- **The audit log is in memory.** It is append-only by construction but does not persist.
- **No product images.** The live assets were not available to this build; pages show a
  labelled placeholder.
- **Company page is a placeholder.** The approved copy exists
  (`../acs-seo/packages/about-acs/`) but its URL is undecided.

## Not yet tested

- Core Web Vitals. No lab measurement has been run.
- Screen readers. axe-core passes at 360 px and 1280 px, but no manual pass with a real
  screen reader has been done, and axe does not catch everything.
- Browsers other than Chromium.
- Real fonts. Google Fonts are blocked in the build container, so screenshots in
  `test-results/screens/` use fallback fonts and are not typographically final.
- Touch-target check covers standalone controls only; links inside running text are
  exempt, as WCAG allows.

## Still missing (planned, not built)

- Canonical tags, `sitemap.xml`, one address per page — M1, and only meaningful once the
  system is `live`, since a demo build is `noindex`.
- Product structured data (M2), search-engine `lastmod` (M2).
- Category pages, the three-ribbon decision, the company URL — Owner decisions D-09,
  D-10, D-11.
- A backend for enquiries, with its own gate.

## Known scanner note

`npm run claims` reports 54 `EVIDENCE_REQUIRED` findings, all CR-06 on a manufacturer's
name used as a product brand (Honeywell, TSC, Zebra, Brady). That is the rule working as
written — a vendor name needs a human to confirm it is a spec reference and not a
partnership claim — and here each one is the brand field of a catalogue entry.

## Review

**This milestone has not been reviewed by anyone but its author.** Until another reviewer
checks it against the exact commit SHA, it counts as NOT RECEIVED, whatever the test
counts say.
