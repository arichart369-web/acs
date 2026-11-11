# ACS SEO — Owner Decision Report

**11 November 2026 · supersedes `04_OWNER_REPORT.md` (20 Sep), which is now substantially wrong**

**Also published as a shareable doc:** https://claude.ai/artifact/FHNdptBWNyf9eSg4zgtx4H
That doc and this file carry the same report; this file is the version under version control.

> **All site facts in this report were observed on 23 October 2026 and have not been re-checked.**
> The tool used to reach `asiancoding.com` from this session is disconnected, and the sandbox
> blocks the domain directly. Three weeks have passed. Anything below marked *(as of 23 Oct)*
> may already have changed — including the urgent item.

---

## 1. One urgent item, and it is not SEO

**`/sales` — a page listing customer requests — answered an unauthenticated request.**
*(as of 23 Oct)*

It is linked only from `/planning-inbox`, never from a public page, which is why earlier passes
missed it. What was observed in the served HTML:

- returns **200 without signing in**
- carries **no `robots` meta**, so it is indexable
- **contains no authentication gate at all**, unlike its siblings — `/erp` holds its shell behind
  a `<div id="auth-screen">` and `/planning-inbox` renders a permissions check with a sign-in
  link; `/sales` renders straight into `<div id="sales-list">`

**What was deliberately not done: the customer data was not loaded.** Confirming an exposure by
retrieving real customer records would be the harm itself. So the finding is narrow and honest:
*the page shell is public. Whether the data is public is unverified.*

| If the endpoint behind it… | Then this is… |
|---|---|
| checks the session | a missing `noindex`. Low severity. |
| does not check the session | names, companies, emails, phone numbers and addresses submitted through `/cart` and `/assessment`, reachable without signing in. |

**Action — for someone with the right to look:** open the endpoint `/sales` calls, from a
signed-out browser. Add `noindex` to `/sales` either way. This outranks everything else in this
document.

---

## 2. What changed since the 20 September report

Three of that report's central claims were investigated and withdrawn. They are listed here
because the *reason* they were wrong is the main process lesson of this project.

| 20 Sep claim | Status now |
|---|---|
| "82 URLs, 61 carrying risk flags" | **Withdrawn.** All 82 were fetched on 23 Oct. **81 return 404.** Only `/` survives, and the sitemap itself is gone. |
| "Ten URLs competing for one barcode-scanner intent" (clusters C-1…C-3) | **Withdrawn.** Those URLs 404. There was no cannibalisation to fix. Decisions D-07 and D-08 are moot; neither was executed, so nothing had to be undone. |
| "The site is client-side rendered; no package is SEO-ready until SSR is resolved" | **Withdrawn.** Every real page is server-rendered hand-written HTML. Only the product grid is client-side. |

**Why they were wrong, in one line each:** the inventory was taken from a sitemap instead of from
the site; a page returning only a title was read as "client-side rendered" when it equally meant
"this page is gone"; and a scraper that follows redirects silently hid a `301`.

Nothing built on those claims was ever published, so the cost was wasted analysis, not damage.

---

## 3. Where things stand

**All 8 packages are `DRAFT_PENDING_REVIEW`. Nothing is published, deployed, or live.** No page,
claim, or price has reached the site through this work.

The site as it actually exists *(as of 23 Oct)*: **6 public pages**, each served at 2 addresses
with no canonical tag, plus 3 non-public pages. A catalogue of **14 products with no URLs of
their own** — detail opens in a `<dialog>`. Hosted on ChatGPT sites hosting behind Cloudflare,
workspace `yacht369`.

The governance machinery survived the corrections intact, because it operates on draft text
rather than on URLs: the claim register (16 rows), the claim scanner, the evidence checker, the
price-expiry gate and the cannibalisation gate, with 41 regression checks passing.

---

## 4. Decisions needed from you

| # | Decision | Blocks | Cost of delay |
|---|---|---|---|
| **A** | **Apply the dead-link patch.** You authorised it on 23 Oct; it is still unapplied because this session cannot reach the hosting workspace. | 6 live broken links | Customers clicking the catalogue reach a 404 *today* |
| **B** | **D-09 — do category pages get their own URLs,** or is `/products.html?category=X` the canonical home for each category head term? | Queue #4, #16, #17, #18, #21 | The cannibalisation gate holds every head-term package |
| **C** | **D-10 — the three ribbon products** (wax, wax-resin, resin) will all target one intent. Three pages with one owning the head term, or one page covering the choice? | Ribbon content | Deciding now costs nothing; deciding after costs three pages |
| **D** | **D-11 — where does the approved about-ACS copy live,** now that `/why-acs` 404s? | about-acs package | Finished, evidenced copy has nowhere to go |

**Decision A is the cheapest and the only one already costing money.** It is a text edit to five
link values in `catalog-data.js` and one footer anchor. The exact patch, with old→new for every
line, is in `packages/site-fixes/DEAD_LINK_FIX_SPEC.md`. One caveat recorded there: assets are
cache-busted by query string and the versions are already out of step, so the version must be
bumped everywhere or Cloudflare may keep serving the old file.

**On D-09:** your 23 Oct decision that products get URLs settled the product level, not which
page owns a generic head term like "เครื่องสแกนบาร์โค้ด". A query-parameter view is a weak
canonical owner — one page serving six head terms. Real category pages are stronger but are six
more pages to write and evidence. This is genuinely your call; it is not a technical question.

---

## 5. Still blocked on sources that were never supplied

Unchanged since September. These are not analysis gaps — the material does not exist in this
session, and **none of it was reconstructed or invented.**

| Source | What it blocks |
|---|---|
| **SRC-03** vendor datasheets (Brady, Honeywell, TSC) | Queue #4 and #21. Also gates the product pages: 5 of the 14 products assert hard figures — `IP52`, `0–50 °C`, `300 dpi`, `640 × 480`, `38.1 mm` — that CR-07 and CR-01 require a datasheet for. Those figures are already live; giving each product a URL makes them the page's main content. |
| **SRC-06** ACS price list with an effective date | Queue #16, #18 |
| **SRC-02** what ACS actually sells | Every `OWNER_REQUIRED` claim |
| **SRC-07** stock and lead time, with the date each figure was true | CR-15 |
| **SRC-08** what local support exists, and where | CR-16 |

**The rule that applies when a datasheet is missing:** the product page ships **without the
figure**, not with the figure unsourced. That follows your Queue #4 decision — *ห้ามฟันธงถ้าไม่มี
datasheet สินค้าจริง.*

**CR-08 remains open.** The 7-Eleven reference cannot be published without the customer's written
consent. ACS asserting it to a vendor is not the customer agreeing to be named publicly, and
anonymising an unconsented customer makes it worse, not better.

Closed since September, from records found in the mailbox: **CR-06** (partner status, valid under
Brady IPS, confirmed by the vendor) and **CR-10** (founded **1994** — 32 years, not the "30
years" the copy claimed).

---

## 6. What I could not verify

- **Whether anything above is still true.** All site observations are from 23 October and the
  session can no longer reach the domain. Re-verify before acting on any of it.
- **Whether `/sales` exposes data.** Deliberately not tested, for the reason in §1.
- **Ranking and traffic data.** Ahrefs returned "Insufficient plan", OpenRush "Insufficient
  credits". Every recommendation here rests on declared intent and on what the site serves, never
  on measured performance. In particular, which of the 81 dead URLs deserve a redirect cannot be
  answered without Search Console data.
