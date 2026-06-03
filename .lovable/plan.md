
## 1. Marketplace listing cards (main feed)

Update the card rendering in `src/routes/marketplace.index.tsx` so each card shows:
- Product image (cover photo from `marketplace_listing_photos`)
- Title
- Price + discount badge (if `compare_at_price_cents` > price → show % off; for now derive from `tags` containing `deal` or new `discount_pct` tag like `-20%`)
- Business name (if listing's user owns an approved business, show its name; otherwise show seller display name)
- Rating (avg rating of seller's business if present, else seller avg from past reviews — fallback hidden if none)
- Commission amount (if listing has a `commission_cents` value; new optional column)
- Add to Cart button (calls existing cart context — if no cart exists yet, wire a lightweight local cart provider that stores items in `localStorage`)
- Save/Favorite button (already-existing `marketplace_favorites` table — add toggle)

DB migration: add nullable `commission_cents int` and `compare_at_price_cents int` to `marketplace_listings`.

## 2. Right sidebar on marketplace listing page

Add a new right column (visible on `lg+`) with four stacked widgets:
- **Sponsored** — businesses where `featured_until > now()` (top 3, with logo + name + link)
- **Trending products** — top 5 listings ordered by `view_count desc` from last 14 days
- **Nearby deals** — listings with `deal` tag, optionally filtered by user city if known
- **Suggested businesses** — random 5 approved businesses in same category as current filter (or any if none)

All implemented as small components in `src/components/marketplace/sidebar/`.

## 3. Business signup with verification

New route `src/routes/business-signup.tsx` (public) with form fields:
- Business name, legal name, business type (LLC/Corp/Sole Prop/Dealership/Other)
- Business email, phone, website
- Address, city, province, postal code
- Tax/Business number (e.g. CRA BN, GST/HST #)
- Upload business documents (business license, incorporation cert, dealer license, etc.) → stored in new public-read-restricted bucket `business-verification` (RLS: only owner + admins can read)
- Submit → creates pending `business_verification_requests` row + creates `businesses` row in `pending` status owned by user

New table `business_verification_requests`:
- id, user_id, business_id (nullable until linked), legal_name, business_type, tax_number, document_paths text[], status (`pending|approved|rejected`), admin_notes, reviewed_by, reviewed_at, created_at

New storage bucket: `business-verification` (private). RLS: owners can upload/read own files in `{user_id}/...`; admins can read all.

When admin approves verification:
- Update `businesses.status = 'approved'`
- Grant `owner` role via `user_roles`
- This single approval unlocks both the business directory listing AND marketplace seller perks (business name shown on listings, verified badge)

Add link "Are you a business? Sign up here →" on `/auth` and homepage.

## Files

**New:**
- `supabase/migrations/{ts}_marketplace_commission_and_business_verification.sql`
- `src/routes/business-signup.tsx`
- `src/components/marketplace/MarketplaceCard.tsx` (extracted with new fields)
- `src/components/marketplace/sidebar/SponsoredWidget.tsx`
- `src/components/marketplace/sidebar/TrendingWidget.tsx`
- `src/components/marketplace/sidebar/NearbyDealsWidget.tsx`
- `src/components/marketplace/sidebar/SuggestedBusinessesWidget.tsx`
- `src/contexts/CartContext.tsx` (localStorage-backed)

**Edited:**
- `src/routes/marketplace.index.tsx` — use new card, add right sidebar grid layout
- `src/routes/marketplace.new.tsx` — add optional commission + compare-at-price fields
- `src/routes/auth.tsx` — add business signup CTA
- `src/routes/__root.tsx` — wrap with CartProvider

## Notes
- Cart is client-side only (localStorage) since there's no orders/checkout flow yet; we can wire Stripe checkout later.
- Verification docs are reviewed manually by admins via existing admin tools (no new admin UI in this change unless asked).
