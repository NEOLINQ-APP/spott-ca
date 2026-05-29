## 1. Tag (keyword) limits

- Free tier: hard cap at **4 tags** per business (enforced in `updateBusinessKeywords` and in `createListingWithAI`).
- Paid "Extra Tags" plan unlocks **+6 tags (10 total)**:
  - Yearly: **$3/mo** ($36/year, billed yearly)
  - Monthly: **$5/mo**
- New Stripe product `spott_extra_tags` with two recurring prices `extra_tags_yearly` ($36/year), `extra_tags_monthly` ($5/month).
- Add column `businesses.extra_tags_until timestamptz`. Webhook extends this on payment/renewal.
- Server fns check `extra_tags_until > now()` → cap = 10, else 4. Friendly error if exceeded.
- UI:
  - Dashboard tag editor shows `used / max` counter + upgrade CTA when at cap.
  - `BoostPanel` gets new "Extra Tags" tile with marketing copy explaining the SEO/discoverability benefit (more tags = appears in more searches, captures long-tail queries, etc.).

## 2. Admin coupon system

- New table `admin_coupons`:
  - `code` (unique, 10-char uppercase), `addon_type` (text — bump_7d, feature_30d, photo_pack, highlights_30d, extra_tags_30d, etc.), `status` (`active` / `redeemed`), `redeemed_by_business`, `redeemed_by_user`, `redeemed_at`, `expires_at` (nullable), `notes`, `created_by`, `created_at`.
  - RLS: admins manage; authenticated users can SELECT by code only via a server fn (no direct anon read).
- Server fns (`src/lib/coupons.functions.ts`):
  - `createCoupon({ addon_type, expires_at?, notes? })` — admin only, generates random code.
  - `listCoupons({ status? })` — admin only.
  - `revokeCoupon({ id })` — admin only.
  - `redeemCoupon({ code, business_id })` — owner of business; validates code is `active` + not expired + business owned by caller; atomically marks redeemed and grants the add-on by extending the corresponding `*_until` column (or inserting an `addon_purchases` row with `amount_cents=0`, `metadata.coupon_code`).
- UI:
  - Admin panel: new **Coupons** tab → form (addon type dropdown, optional expiry, notes) + table of issued codes with copy button, status, redeemed by, revoke action.
  - Dashboard: each business card gets a small **"Redeem coupon code"** input → success toast + re-fetch.

## 3. Plumbing

- Stripe webhook (`src/routes/api/public/payments/webhook.ts`) handles `extra_tags_*` prices by extending `extra_tags_until` by 30/365 days on payment.
- Update `entitlements.ts` with `getTagLimit(business)` helper.
- Migration includes GRANTs + RLS for `admin_coupons`.
- Silent fix for unrelated SSR error: lazy-load leaflet in `business-map.tsx` (currently breaking `/business/$slug` SSR — `window is not defined`).

## Out of scope
- Refunds / partial credit for unused coupon time.
- Per-coupon usage caps (single-use only, as you chose).
- Bulk coupon CSV export (can add later).

Reply "go" to build, or tell me what to change.
