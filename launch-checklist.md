# Spott.ca Launch Checklist

Production domain: **https://www.spott.ca** (apex `https://spott.ca`, preview `https://spott-ca.lovable.app`).

Use this file as a pre-flight gate before announcing launch or a major release. Every box must be green against the **production domain** — not preview, not custom staging.

---

## 1. robots.txt — production domain check

File: [`public/robots.txt`](public/robots.txt)

**Current contents (must match):**

```
User-agent: *
Allow: /

Sitemap: https://www.spott.ca/sitemap.xml
```

- [ ] `curl -sS https://www.spott.ca/robots.txt` returns HTTP 200 and the block above verbatim.
- [ ] `curl -sS https://spott.ca/robots.txt` also returns 200 (apex → www redirect is fine, but must not 404).
- [ ] `Sitemap:` directive uses `https://www.spott.ca/sitemap.xml` — **not** `lovable.app`, **not** an `id-preview-…` URL, **not** `http://`.
- [ ] No `Disallow: /` under `User-agent: *` (that would block Google entirely).
- [ ] Google Search Console → *Settings → robots.txt* shows "Fetched" with no parse errors.

## 2. sitemap.xml — production domain check

File: [`src/routes/sitemap[.]xml.ts`](src/routes/sitemap[.]xml.ts) — server route, generated on request.

- [ ] `curl -sS https://www.spott.ca/sitemap.xml` returns HTTP 200 with `Content-Type: application/xml`.
- [ ] Every `<loc>` starts with `https://www.spott.ca/` — no `lovable.app`, no `localhost`, no relative paths.
- [ ] `BASE_URL` constant in `src/routes/sitemap[.]xml.ts` is `https://www.spott.ca`.
- [ ] Static routes present: `/`, `/browse`, `/directory`, `/cities`, `/for-business`, `/pricing`, `/business/new`, `/auth`.
- [ ] Dynamic entries include:
  - [ ] one `/city/<slug>` per row from `listCityPages()`
  - [ ] one `/business/<slug>` per row in `businesses` where `status = 'approved'`
- [ ] `lastmod` values are valid ISO-8601 (spot-check a few `<lastmod>` nodes).
- [ ] Total URL count sanity check: `curl -sS https://www.spott.ca/sitemap.xml | grep -c '<loc>'` returns a reasonable number (≥ static routes + city pages).
- [ ] Google Search Console → *Sitemaps* → submit `https://www.spott.ca/sitemap.xml` — status "Success", discovered URLs > 0.
- [ ] `Cache-Control: public, max-age=3600` header present (allows Google to re-fetch hourly).

**Quick shell validation:**

```bash
# Both files reachable and pointing to prod
curl -sS -o /dev-null -w "robots: %{http_code}\n" https://www.spott.ca/robots.txt
curl -sS -o /dev-null -w "sitemap: %{http_code}\n" https://www.spott.ca/sitemap.xml

# Every <loc> must be on the prod domain
curl -sS https://www.spott.ca/sitemap.xml \
  | grep -oE '<loc>[^<]+</loc>' \
  | grep -vE '^<loc>https://www\.spott\.ca/' \
  && echo "❌ non-prod URLs found" \
  || echo "✅ all URLs on www.spott.ca"

# Sitemap referenced in robots must match production
curl -sS https://www.spott.ca/robots.txt | grep -i '^Sitemap:'
# expected: Sitemap: https://www.spott.ca/sitemap.xml
```

## 3. DNS & TLS

- [ ] `A @ 185.158.133.1` and `A www 185.158.133.1` resolve.
- [ ] `_lovable` TXT verification record still present.
- [ ] `https://spott.ca` and `https://www.spott.ca` both serve valid TLS (no cert warnings).
- [ ] Apex redirects to `www` (or vice-versa) consistently — pick one canonical host and stick to it.

## 4. Head metadata (SEO)

- [ ] Home `<title>` and `<meta name="description">` are Spott-branded, not `Lovable App` / `Lovable Generated Project`.
- [ ] `og:title`, `og:description`, `og:type`, `twitter:card` set on `__root`.
- [ ] Leaf routes (business, city, marketplace, vehicle) set their own `og:image` where a hero image exists.
- [ ] `<link rel="canonical">` on each indexable route points at `https://www.spott.ca/...`.

## 5. RLS & data-leak audit (backend)

Reviewed against production schema:

**`marketplace_orders`** ✅ safe

- INSERT: `buyer_id = auth.uid()`
- SELECT: `buyer_id = auth.uid()` OR admin OR seller-of-any-line-item (via `marketplace_order_items`)
- UPDATE: `buyer_id = auth.uid() AND status = 'pending'`
- DELETE: no policy → denied for `authenticated`; only `service_role` can delete
- No `TO anon` policies — orders are invisible to logged-out users
- Buyer contact/shipping columns are only reachable through the SELECT policy above

**`reviews`** ✅ safe

- SELECT: `is_hidden = false OR user_id = auth.uid() OR admin` — hidden reviews stay hidden from the public
- INSERT/UPDATE/DELETE: `user_id = auth.uid()` (owner-only) with admin override on delete
- Owner-reply UPDATE policy is present but its WITH CHECK freezes every existing column; safe (blocks tampering) but currently makes owner replies a no-op — track as a product bug, not a leak
- `reviews.user_id` is not exposed as PII beyond the review author itself

**`review_reports`** ✅ safe — reporter and admin only.

**`review_photos`** ✅ safe — public read of photos attached to non-hidden reviews; write locked to review author.

- [ ] Re-run `supabase--linter` before launch; no critical findings.
- [ ] `has_active_subscription`, `has_role`, `is_thread_participant` remain `SECURITY DEFINER` with locked `search_path = public`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never referenced in client code (`rg -n SERVICE_ROLE src/` should return only `.server.ts` files).

## 6. Ingest / background jobs

- [ ] `POST /api/public/hooks/ingest-tick` returns `202 { ok:true, queued:true }` immediately (< 500ms) — heavy work runs off-thread via `waitUntil` / detached promise.
- [ ] `pg_cron` job `spott-saved-search-alerts` visible in `cron.job` and last run succeeded.
- [ ] `cron.job_run_details` for the last 24h shows no repeated failures.

## 7. Auth & payments

- [ ] Email/password sign-in works end-to-end on prod.
- [ ] Google OAuth returns to `redirect` param (deep-link tested from `/marketplace/new`).
- [ ] Stripe live webhook secret configured; a real 1¢ test purchase clears through `marketplace_orders` → seller alert email.
- [ ] `has_active_subscription` returns true for a known paid account.

## 8. Preview / staging isolation

- [ ] `spott-ca.lovable.app` and `id-preview--…lovable.app` are **not** submitted to Search Console.
- [ ] No live env points at a preview URL for redirects, emails, or webhooks.

---

**Sign-off:** ready to launch only when every box in sections 1–7 is checked, dated, and initialled by whoever ran the check.
