# Spott.ca SEO / Ads / Auth worklog (Oct 2026)

Shared handoff notes for any agent or person continuing this work. Update this file when you change anything listed here.

Everything below is merged to `main` of `NEOLINQ-APP/spott-ca` and LIVE on spott.ca (live-verified). Owner's standing scope: spott.ca is **Canada-only** (`spott-ca-canada-only`).

## What shipped (PRs #5-#8)
- **#5 Country picker removed** from `LocationCascadeFilter` + its 5 callers (events, jobs, marketplace.index, real-estate, vehicles.browse). Province is now the first dropdown, always enabled.
- **#6 `@tanstack/react-start` -> 1.168.60.** Vercel *blocks* production deploys on <1.168.60 (CVE-2026-102989 XSS). Do not set `DANGEROUSLY_DEPLOY_VULNERABLE_TANSTACK_START_XSS`.
- **#8 Marketplace SEO landing pages for every province + city:** hub `/marketplace/in`, `/marketplace/in/<province-slug>` (13, e.g. `alberta`), `/marketplace/in/<city-slug>` (73, e.g. `calgary-ab`). Files: `src/routes/marketplace.in.$slug.tsx`, `marketplace.in.index.tsx`, `src/lib/marketplace-locations.functions.ts` (active listings only, no contact fields, limit 48). Slugs reuse `src/lib/city-pages.ts`. Added to `sitemap.xml.ts` (sitemap has ~71+ `marketplace/in` URLs; check count before quoting). BreadcrumbList JSON-LD + canonical + internal links province<->cities. Local check showed real listings: Alberta 15, Ontario 29, Calgary 7.
- **#8 also fixed a real SEO bug:** `src/routes/marketplace.tsx` layout emitted `canonical = https://spott.ca/marketplace`, so EVERY marketplace page (incl. each listing) had two conflicting canonicals. Layout canonical removed; `marketplace.index.tsx` now sets its own `https://www.spott.ca/marketplace`.
- **#7 Google/Apple auth removed (owner: "we don't want Google Auth").** Deleted `google()`/`apple()` handlers + "or" divider in `src/routes/auth.tsx`, the Safety-page line recommending Google/Apple sign-in, and unused `src/integrations/lovable/index.ts`. Google provider was already OFF in Supabase (verified via `/auth/v1/settings`: only `email` true) and hidden since 2026-09-14. Email/password login unchanged.

## How deploys work now (important)
- **Merging a PR to `main` auto-deploys production** via the GitHub->Vercel integration (project `spott-ca`, user `neolinq-app`). No manual `vercel --prod` needed. Merge = deploy; test first.
- **PR preview deployments lack Supabase env vars** -> any DB-backed page 500s there (even pre-existing `/city/...`). Verify data pages with local `vite dev` + a copy of `spott-ca/.env` (delete the copy after), not the preview.
- `spott-ca` working tree is dirty with other sessions' uncommitted work (CLAUDE.md, auth.tsx, billing/dashboard/pricing/for-business etc.) so `git pull` there fails. Always work in a throwaway worktree off `origin/main`; do NOT stash/discard others' changes.
- Netlify ("spottapp") and Cloudflare ("spott-ca") PR checks fail on every PR — separate stray integrations, not the live site; harmless but noisy.
- On Windows Git Bash use `MSYS_NO_PATHCONV=1` for `vercel curl /path`. Building `vercel` from a lean worktree (no node_modules) is fast; with node_modules/.output present it hangs uploading.

## OPEN items (owner decisions / not done)
1. **Listing detail pages are gated:** `/marketplace/<id>` wraps content in `AuthGate`, so crawlers see a sign-in wall though `head()` meta/JSON-LD exist and the sitemap lists all listings. Proposed fix (awaiting owner yes): public preview (title, price, location, description, first photo) with seller contact + full details still behind sign-in. NOT changed.
2. **Google Ads:** not started. Offered: draft keyword/ad-group plan per province+city as a file (no spend), or operate in the account if owner gives access. `src/lib/googleAds.functions.ts` + `googleAdsOAuth.server.ts` exist (per-business ads connection; unrelated to Spott's own ad account).
3. **Google Search Console:** unknown whether `https://www.spott.ca/sitemap.xml` was ever submitted. Site carries TWO `google-site-verification` tags (`rU5LrsWg...` in root head(), `FDFmg6UZ...` raw JSX in `__root.tsx`) = two separate GSC accounts verified; the emails behind them are NOT recorded anywhere. The owner's Google account emails are not recorded here; ask the owner. Owner must sign in to GSC (manual) and submit the sitemap; then check Pages/indexing for `/marketplace/in/*`.
4. **Cleanup pending owner OK:** stray EMPTY Vercel project `spott-prev` (created by my mistake; harmless, not spott.ca) - delete only with approval per `standing_rule_no_destructive_actions_without_approval`. Leftover git worktrees/folders: `C:\Users\surew\spott-seo-work`, `spott-gauth`, `spott-prev` (+ earlier `spott-ca-deploy-clean`, deleted by owner). Remove with `git worktree remove` after checking status.
5. Known from earlier audits (`spott-ca-seo-sitemap-fix`, `spott_ca_growth_diagnosis_2026_09_24`): view counters not recorded (traffic unmeasured), claim-campaign details, 25 listings without photos.

## Verification recipe (re-run before claiming status)
`curl -s -o /dev/null -w "%{http_code}" https://www.spott.ca/marketplace/in/alberta` (200), `/marketplace/in/nowhere` (404), listing page should show exactly ONE canonical, `curl .../sitemap.xml | grep -c marketplace/in`.

