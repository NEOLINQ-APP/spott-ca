# Promoter Engine + Admin Command Center

Two connected phases. Phase 2 (Promoter) is the bigger lift; Phase 3 reuses the admin shell.

---

## Phase 2 — Promoter & Rewards Engine

### Data model (one migration)

New tables (RLS + GRANTs per project rules):

- `promoters` — application + status. Fields: `user_id`, `status` (`pending|approved|rejected|suspended`), `display_name`, `channel_url`, `audience_size`, `pitch`, `commission_pct` (10–30), `customer_discount_pct` (25–50), `promo_code` (unique, `SPOTT-<8char>`), `stripe_connect_account_id`, `payouts_enabled`, `approved_at`, `approved_by`, notes.
- `promoter_redemptions` — one row per successful use. Fields: `promoter_id`, `code`, `redeemer_user_id`, `scope` (`subscription|featured_addon`), `stripe_invoice_id` / `stripe_checkout_session_id`, `stripe_payment_intent_id`, `gross_amount_cents`, `discount_amount_cents`, `net_amount_cents`, `commission_amount_cents`, `currency`, `status` (`pending|earned|reversed`), `earned_at`.
- `promoter_payouts` — `promoter_id`, `amount_cents`, `currency`, `status` (`requested|processing|paid|failed`), `stripe_transfer_id`, `requested_at`, `paid_at`, `failure_reason`.

RLS:
- Promoter reads own rows; admins read all.
- Inserts to `promoters` restricted to own `user_id`; status/commission columns immutable to the applicant via trigger (only admins mutate).
- Redemptions & payouts: read-own + admin-all; writes service-role only (webhook + payout handlers).

Note: reuses existing `promo_codes` table where possible — a promoter row references its `promo_codes` entry (marked `scope='promoter'`, `applies_to='subscription,featured_addon'`). A CHECK/trigger on `promo_codes` blocks promoter codes from being applied to marketplace/vehicle checkouts.

### Server functions (`src/lib/promoters.functions.ts`)

- `applyToPromote(data)` — auth'd; inserts pending row.
- `listMyPromoter()` / `listMyRedemptions()` / `listMyPayouts()` — auth'd, own rows.
- `requestPayout({ amount_cents })` — auth'd; validates min $50 balance, creates `promoter_payouts` row `requested`, kicks Stripe transfer.
- `createConnectOnboardingLink()` — auth'd; Stripe Express account + AccountLink; stores `stripe_connect_account_id`.
- Admin: `adminListPromoters`, `adminReviewPromoter({ id, action, commission_pct, customer_discount_pct })` — verifies `has_role('admin')`, generates unique `SPOTT-XXXXXXXX` code on approve, mints matching `promo_codes` row.

### Promo-code enforcement (critical constraint)

Two enforcement points:
1. **DB trigger** on any table that stores an applied promo (`marketplace_orders`, `vehicle_leads`, listing purchase records): if `promo_code` references a promoter-scoped code, `RAISE EXCEPTION`. Force P2P transactions to reject promoter codes at the database level.
2. **Application-layer** in Stripe checkout server fn (`createCheckoutSession` for subscriptions and `createFeaturedAddonCheckout`): resolve code → verify `scope='promoter'` OK; the marketplace/vehicle listing purchase server fns reject any code where `scope='promoter'`.

### Stripe wiring

- Subscription checkout & Featured add-on checkout: accept `promoter_code`, pass to Stripe as a coupon (created dynamically per promoter with `percent_off = customer_discount_pct`, cached in `promo_codes.stripe_coupon_id`), and stamp `metadata.promoter_id` + `metadata.promoter_code` on the Session.
- Webhook (`src/routes/api/public/payments/webhook.ts`): on `invoice.paid` and `checkout.session.completed` with `metadata.promoter_id`, insert `promoter_redemptions` with computed commission, mark `earned`.
- Payouts via Stripe Connect Express: `stripe.transfers.create({ amount, destination: connect_account_id })` inside `requestPayout` handler, gated to promoters with `payouts_enabled = true` and ledger balance ≥ requested amount.

All Stripe access via `createStripeClient(env)` from `@/lib/stripe.server` — never direct SDK. Errors returned as `{ error: getStripeErrorMessage(e) }`.

### UI

Public / user-facing:
- `/promote` — landing + FAQ + application form (`PromoterApplyForm`).
- `/_authenticated/promoter` — dashboard tabs:
  - **Overview**: status card, promo code w/ copy button, share links.
  - **Earnings**: table of redemptions, lifetime + pending totals.
  - **Payouts**: Connect onboarding CTA (if not enabled) → payout request form + history.
- Universal promo-code input on subscription checkout and Featured add-on checkout screens accepts `SPOTT-*` codes.

Admin:
- `/admin/promoters` — queue with filters (pending/approved/rejected/suspended), review drawer with sliders for commission % (10–30) and discount % (25–50), approve/reject/suspend actions.

---

## Phase 3 — Admin Command Center

Single dashboard at `/admin/command` with tabbed sections; each tab is a server-fn-backed component gated by `has_role('admin')`.

### Dealers tab
- Table of businesses with `type='dealer'`.
- Actions per row: **override subscription tier** (writes `subscriptions.price_id` + logs to `admin_audit_log`), **suspend** (sets `businesses.suspended_at`, cascades RLS to hide listings), **pause inventory feed** (sets `import_sources.paused=true` for that business).

### Content / SEO tab
- Bulk-editor for `businesses` rows: `seo_title`, `seo_description`, `seo_keywords` (new nullable columns via migration).
- Route heads on `/directory/$slug` read those columns; falls back to computed default. "Spott.ca" appended to titles by default.
- Bulk-apply template: `{name} in {city} — {category} | Spott.ca` via one-click action.

### Gamification tab
- New tables:
  - `user_badges` — `user_id`, `badge_key` (`verified`, `fast_replier`, `top_reviewer`, `founding_member`), `awarded_at`, `awarded_by`.
  - `premium_vouchers` — `user_id`, `duration_days`, `status` (`pending|active|redeemed|expired`), `activated_at`, `expires_at`, `source_badge_key`.
- Rules engine (Postgres function `award_badges_for_user`) triggered daily by cron:
  - `verified` badge → 30-day voucher.
  - `fast_replier` (median first-reply < 2h over last 30 days on ≥ 5 threads) → 30-day voucher.
- Voucher activation grants a synthetic `subscriptions` row `status='trialing'`, `current_period_end = now() + duration`, `environment=<current>`. Access checks already gate on `has_active_subscription`.
- Admin can manually award badges + issue vouchers here.

### Moderation tab
- Aggregates existing surfaces: `review_reports`, `business_claims` pending, flagged marketplace listings (`status='flagged'`), reported users (new `user_reports` table if not present).
- One-click resolve/hide/warn/suspend actions.

### Audit log
- New `admin_audit_log` table records every admin-privileged mutation (actor, action, target, before/after JSON). Visible in a footer of the command center.

---

## Security posture

- Every new table: RLS enabled, GRANTs to `authenticated` + `service_role`, no `anon` unless the column is truly public.
- Every admin server fn re-checks `has_role(auth.uid(), 'admin')`; middleware alone is not sufficient.
- Stripe Connect account IDs stored server-side only; never returned to the client except the promoter's own.
- Promo-code scope enforced in DB trigger AND in app code so a client-side bypass still fails at insert.
- Feed-sync / API-key endpoints require verified dealer (`businesses.dealer_verified = true`) — enforced in server-fn guards, not just UI.

---

## Rollout order

1. Migration 1: promoter tables + promo-code scope trigger + admin_audit_log.
2. Promoter server fns + Stripe Connect onboarding.
3. `/promote` + `/promoter` UI.
4. Webhook updates for promoter redemptions.
5. `/admin/promoters` review queue.
6. Migration 2: gamification + SEO columns + user_reports.
7. `/admin/command` shell + Dealers tab.
8. Content/SEO tab + route-head wiring.
9. Gamification tab + cron for auto-award.
10. Moderation tab aggregation.

## Files touched (technical)

- **New migrations** (2): promoter + audit; gamification + SEO + reports.
- **New server fns**: `src/lib/promoters.functions.ts`, `src/lib/admin-command.functions.ts`, `src/lib/badges.functions.ts`.
- **New routes**: `/promote`, `/_authenticated/promoter`, `/admin/promoters`, `/admin/command` (+ subroutes for tabs).
- **Edits**: `src/routes/api/public/payments/webhook.ts` (promoter redemption handling), `src/utils/payments.functions.ts` (accept `promoter_code`), marketplace / vehicle checkout paths (reject promoter codes), Featured add-on checkout, `/directory/$slug` head().
- **New components**: `PromoterApplyForm`, `PromoterDashboard`, `PromoterReviewDrawer`, `AdminCommandLayout`, `DealersTab`, `SeoBulkEditor`, `GamificationTab`, `ModerationTab`, `AuditLogFooter`.

This is ~10–15 edit turns of work. I'll ship in the rollout order above and confirm at each phase boundary before continuing.

**Approve to start with Migration 1 + promoter server fns + `/promote` application form?**