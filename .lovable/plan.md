# Spott.ca — Full build plan

Rebrand from bario.ca → **Spott.ca** and ship the remaining product in 4 staged phases so each piece lands working before the next.

## Phase 1 — Rebrand + Reviews + AI preview step
- Rename everywhere: header logo, page titles, meta tags, i18n strings, emails. Keep "blue" theme.
- **Reviews with photos**: new `reviews` table (rating 1–5, body, business_id, user_id) + `review_photos` table. Storage bucket `review-photos` with RLS so only the review owner can upload, everyone can read.
- On each business detail page (`/business/$slug`): list reviews, "Write a review" form with star picker + up to 4 photos on free tier (enforced server-side).
- **AI preview step on `/new-listing`**: split into 2 stages — (1) fill basics + pitch → AI draft shown in an editable preview card → (2) "Publish" submits. Owner can re-generate, tweak description/category/tagline before saving.

## Phase 2 — Dashboards + follow/like
- `/dashboard` (auto-routes by role):
  - **Business owner**: their listings (status: pending/approved/rejected), claim status, reviews received, one-click reply, simple stats (views, review count, avg rating).
  - **Customer**: recent reviews written, businesses followed, recently viewed (tracked via `business_views` table), liked reviews.
- **Follow** (`business_follows` table) + **Like** (`review_likes` table) with optimistic UI. Counts on business cards.

## Phase 3 — Stripe packages + photo top-ups
- Enable **Lovable's built-in Stripe** (seamless, no key needed).
- Draft pricing tiers (editable later):

| Tier | Monthly | Photos/listing | Featured | Bump-ups | Replies |
|---|---|---|---|---|---|
| Free | $0 | 4 | — | — | ✓ |
| Pro | $19 | 15 | Category-featured | 2/mo | ✓ + analytics |
| Business | $49 | Unlimited | Homepage + category | 8/mo | + priority support |

- **Top-ups (one-time)**: +10 photos pack $5, single bump-up $3, 7-day homepage feature $15.
- `subscriptions` table (synced from Stripe webhook), `entitlements` view to check photo cap / bump quota.
- Pricing page `/pricing`, manage page `/dashboard/billing` with portal link.

## Phase 4 — Admin dashboard
- `/admin` (gated by `admin` role from existing `user_roles` table):
  - Overview: total users, new signups today/7d/30d, paying customers, MRR estimate, pending listings.
  - **Users**: list, search, view signup date, current plan, listings count, ban/unban.
  - **Listings**: pending approval queue (approve/reject/edit), all listings, takedown.
  - **Claims**: pending business-claim requests (Phase 4b once verification flow is in).
  - **Revenue**: subscription breakdown by tier, recent transactions.
  - **Reviews moderation**: flagged reviews, hide/delete.

## Technical notes
- All new tables use RLS scoped via `auth.uid()` + `has_role()` helpers.
- Photo uploads via Supabase Storage with per-user folders.
- Server functions for: review create, follow toggle, like toggle, listing approve, photo-cap check.
- Stripe webhook lands at `/api/public/stripe-webhook` with signature verification → updates `subscriptions` table.
- Admin queries via `supabaseAdmin` server functions gated by `has_role(uid,'admin')`.

## Order of approval
I'll execute Phase 1 immediately after you approve this plan. After Phase 1 ships and you've tried it, say "next" and I'll do Phase 2, then 3 (Stripe), then 4 (admin). This keeps each step reviewable instead of one massive drop.
