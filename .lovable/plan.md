# Coupons v2 + Promoter / Affiliate Program

Big expansion of the coupon system. Splitting into 3 layers so it stays clean.

---

## 1. Coupons get usage modes (single-use vs multi-use)

Extend `admin_coupons`:
- `max_uses int` — null = unlimited, 1 = single-use (current behavior), N = capped (e.g. 100 redemptions of a 10%-off code).
- `uses_count int default 0` — incremented atomically on every successful redemption.
- `discount_kind text` — `addon_grant` (current behavior: grants an add-on for free) or `percent_off` / `amount_off` (for future Stripe-discount style codes — stored now, wired to Stripe checkout later).
- `discount_value int` — percent (1–100) or cents off, depending on `discount_kind`.
- Status auto-flips to `exhausted` when `uses_count >= max_uses`.

Admin UI (Coupons tab):
- New "Usage limit" field: radio (Single use / Limited / Unlimited) + number input when Limited.
- New "Reward type" selector: "Grant add-on" (existing dropdown) OR "Percent off" OR "Fixed amount off".
- Table shows `uses_count / max_uses` and last-used date.

Redeem flow:
- Removes the "first to claim wins" lock. Instead: atomic `uses_count = uses_count + 1` guarded by `uses_count < max_uses` (or `max_uses IS NULL`). Same business can't redeem the same code twice.

---

## 2. Promoter program (sponsor sign-up)

New table `promoters`:
- `user_id` (unique, links to auth user)
- `display_name`, `company_name`, `email`, `phone`, `website`, `social_handle`
- `commission_type` — `flat` (e.g. $5 per signup) or `percent` (e.g. 20% of sale)
- `commission_value int` — cents or percent
- `payout_method` — `etransfer` / `paypal` / `stripe`
- `payout_details text` (free text — interac email, paypal email, etc.)
- `status` — `pending` / `approved` / `suspended`
- `notes text` (admin notes)
- `created_at`, `approved_at`, `approved_by`

Public **`/promoters`** route — landing + sign-up form:
- Hero explaining "Earn money promoting Spott.ca"
- Form: name, company, email, phone, social link, why they want to join
- Submits → creates promoter row with `status=pending`
- Existing users auto-link; logged-out users get prompted to sign up first

Promoter dashboard **`/promoter`** (visible to users with a promoter row):
- Their stats: total redemptions, total commission earned, pending payout
- List of their codes + per-code performance
- Table of every redemption (date, business name, code used, commission earned)

Admin **Promoters tab** (next to Coupons):
- Pending applications queue → approve/reject
- All promoters list with status, total earned, codes issued
- Per-promoter view: edit commission, create code linked to them, mark payouts as paid

---

## 3. Linking codes to promoters + redemption tracking

Add to `admin_coupons`:
- `promoter_id uuid nullable` — when set, every redemption credits this promoter.

New table `coupon_redemptions` (the actual usage log):
- `coupon_id`, `redeemed_by_user`, `redeemed_by_business`, `redeemed_at`
- `addon_type` (snapshot of what was granted)
- `promoter_id` (snapshot — for commission attribution even if coupon is later edited)
- `commission_cents int` — calculated at redemption time, snapshotted
- `commission_status` — `pending` / `paid` / `void`
- `commission_paid_at`, `commission_payout_ref`

Admin **Payouts** view:
- Filter by promoter, date range, status
- Bulk "mark paid" with payout reference (e-transfer ID, etc.)
- Export to CSV for accounting

---

## Plumbing

- Migration adds new columns/tables + GRANTs + RLS (admins manage; promoters read-only on their own rows; redemption inserts via server fn only).
- Update `src/lib/coupons.functions.ts`:
  - `redeemCoupon` → handle multi-use, insert into `coupon_redemptions`, calculate commission.
  - New: `listMyRedemptions`, `getMyPromoterStats`.
- New `src/lib/promoters.functions.ts`:
  - `applyAsPromoter`, `listPromoters` (admin), `approvePromoter`, `updatePromoter`, `markCommissionPaid`.
- New components: `PromoterSignupForm`, `PromoterDashboard`, `AdminPromotersTab`, `AdminPayoutsTab`.
- New routes: `/promoters` (public landing+signup), `/promoter` (logged-in dashboard).
- Admin index gets 2 new tabs: **Promoters**, **Payouts**.

## Out of scope (call out, don't build)
- Auto-payouts via Stripe Connect (manual mark-paid only for now).
- Cookie-based "click → signup" attribution (codes only).
- Multi-tier referrals (promoter recruits promoter).
- Stripe-native percent/amount-off discount wiring — schema captured now, applied to checkout in a later pass.

Reply "go" to build, or tell me what to trim / change.
