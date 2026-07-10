# Dealer Backend — Compliance, Sync, Trust

Large scope. Breaking into 3 shippable phases matching your outline. Each phase is a separate turn so you can review before I move on.

---

## Phase 1 — Compliance-First Architecture

### 1.1 Mandatory Disclosure Fields on vehicles

Migration adds to `public.vehicles`:

- `prior_use` — enum (`personal`, `lease`, `rental`, `taxi`, `rideshare`, `emergency`, `fleet`, `police`, `driver_ed`, `unknown`) — NOT NULL default `personal`
- `odometer_status` — enum (`accurate`, `exceeds_mechanical_limits`, `not_actual`) — NOT NULL default `accurate`
- `odometer_km` — int (already exists as `mileage_km`, reused)
- `accident_history` — enum (`none_declared`, `minor`, `major`, `structural`, `salvage_rebuilt`, `unknown`)
- `damage_amount_cents` — int (nullable; ≥ $3,000 must be disclosed in most provinces)
- `carfax_url` — text (nullable)
- `disclosure_signed_at` — timestamptz (set when dealer confirms disclosures)
- `disclosure_signed_by` — uuid → auth.users

Publish gate: server fn `publishVehicle` throws unless all four disclosure fields are set AND `disclosure_signed_at` is present.

UI: new **Compliance** step in `vehicles.sell.tsx` with plain-language help text ("Required by AMVIC / OMVIC / VSA / OPD"). Public listing shows the disclosures in a "Vehicle history & disclosures" card.

### 1.2 All-In Pricing Enforcement

- Add `price_all_in` boolean (default true for dealer listings) and `price_excludes` text[] to vehicles.
- Server-side validator on business-account listings: rejects listings that add doc fees, admin fees, freight, or PDI as line items — those must be baked into `price_cents`. Only `GST/PST/HST/QST/luxury tax` may be excluded.
- Publishable pattern-match on description ("+ doc fee", "plus admin", etc.) — flags for admin review in `business_verification_requests` rather than hard-blocking.
- Consumer-facing badge: **"All-in price · taxes extra"** vs warning banner if flagged.

### 1.3 Dealer Verification Gate

Reuse existing `business_verification_requests` table; add columns:

- `amvic_number` / `omvic_number` / `vsa_number` / `opd_number` (province-scoped, one required)
- `business_license_url` — signed storage path in `business-verification` bucket
- `dealer_license_expires_at` — date

Add `businesses.dealer_verified` boolean. RLS trigger: dealer vehicles with `status='published'` require `dealer_verified=true`. Unverified dealers can still create drafts.

Admin queue at `/admin/verifications` gets a **Dealer** tab surfacing license image + regulator number for one-click approve.

---

## Phase 2 — Automated Dealer Sync

### 2.1 Feed Mapping Engine

New tables:

- `dealer_feeds` — `id, business_id, source_type (csv|xml|url), source_url, auth_header, schedule (hourly|daily), status, last_run_at, last_error`
- `dealer_feed_mappings` — `id, feed_id, target_field, source_header, transform (json)` — user maps `Stock_No → external_id`, `Retail_Price → price_cents (÷100 or ×100)`, etc.
- `dealer_feed_runs` — audit of each sync (created, updated, skipped, errors[])

UI at `/dealer/feeds`:

1. Upload CSV or paste XML/URL → preview first 5 rows.
2. Drag-and-drop mapper: our schema fields (VIN, Year, Make, Model, Trim, Price, Mileage, Body, Fuel, Transmission, Drivetrain, Photos, Description, Prior Use, Accident History) on the left, dealer's headers on the right.
3. Save mapping → "Sync now" button + optional recurring schedule.

Worker: TanStack server route `/api/public/hooks/dealer-feed-sync` triggered by `pg_cron` hourly. Uses VIN as upsert key. Photos array of URLs is fetched, stored in `vehicle-photos` bucket. Missing VINs get soft-deleted (status=`sold_off_platform`).

### 2.2 DMS Integration / Standardized Schema

- `vehicles.external_id` + `vehicles.external_source` already partly exist — formalize with unique index on `(business_id, external_id)`.
- Support **AutoTrader-style vehicle XML** and generic OpenAPI JSON as first-class schemas (auto-detect on feed upload, skip the mapper when detected).
- Ingest URLs support Basic Auth and Bearer tokens (encrypted at rest in `pgsodium`).
- Publish OpenAPI spec at `/api/public/dealer/openapi.json`; POST/PATCH endpoints under `/api/public/dealer/vehicles` for DMS push (Phase 3 adds API keys — v1 uses a dealer-scoped `feed_token`).

### 2.3 Lead Tracking with Disclosure Snapshot

Extend `vehicle_leads`:

- `disclosure_snapshot` jsonb — captured at lead creation (`prior_use`, `odometer_status`, `accident_history`, `damage_amount_cents`, `price_cents`, `price_all_in`, `vin`)
- `disclosure_signed_at_snapshot` timestamptz
- `listing_url_snapshot` text

Trigger `capture_disclosure_on_lead` fires BEFORE INSERT to freeze the state, giving a legal audit trail even if the dealer edits the listing later. Dealer + buyer can both request a signed PDF of the snapshot (server fn `generateDisclosurePdf`).

---

## Phase 3 — Security & Trust

### 3.1 Verified Dealer Badge

Auto-set `businesses.verification_badge='verified_dealer'` when:
- Admin approves the license upload, AND
- Regulator number matches province format, AND
- License expiry ≥ today.

Nightly cron re-checks expiry; expired → badge revoked + email to dealer.

### 3.2 Speed-to-Lead (60s SLA)

Currently leads only email the business contact. Upgrade:

1. **Assignment**: `businesses.lead_routing` = `single | round_robin | per_vehicle`. New `dealer_salespeople` table (name, email, phone, active).
2. **Channels**: parallel dispatch — Brevo email + Brevo SMS (needs the Brevo SMS product enabled on your account) + in-app notification.
3. **Latency**: lead insert trigger enqueues to `pgmq` immediately; worker dispatches inside the same request cycle (target < 5s, alarm > 60s).
4. **Metrics**: `lead_dispatch_log` (channel, sent_at, delivered_at, opened_at). Admin dashboard shows P50 / P95 speed-to-lead per dealer.
5. **Escalation**: if no dealer response in 15 min → notify dealer owner. In 60 min → surface to admin.

---

## Technical Details

**Migrations (Phase 1)**: 1 migration adding enums + columns + publish trigger + RLS updates. GRANTs on new enums.

**Migrations (Phase 2)**: `dealer_feeds`, `dealer_feed_mappings`, `dealer_feed_runs`, `vehicle_leads` extension, disclosure snapshot trigger. All with `service_role` + `authenticated` grants scoped to `business.owner_id = auth.uid()`.

**Migrations (Phase 3)**: `dealer_salespeople`, `lead_dispatch_log`, badge trigger, expiry cron.

**Storage**: `business-verification` bucket (already exists, private) reused for license uploads. Signed URLs only.

**Server functions** (new files under `src/lib/`):
- `dealer-compliance.functions.ts` — publish gate, all-in validator
- `dealer-feeds.functions.ts` — CRUD + preview + syncNow
- `dealer-feed-sync.server.ts` — parser (csv-parse, fast-xml-parser), upserter
- `lead-dispatch.server.ts` — parallel Brevo channels + logging
- `disclosure-pdf.server.ts` — server-rendered PDF (react-pdf) of the snapshot

**Routes**:
- `/dealer/verification` (upload license + regulator number)
- `/dealer/feeds` (list + create + mapper)
- `/dealer/feeds/$id` (edit mapping, run history)
- `/dealer/team` (salespeople + routing)
- `/api/public/hooks/dealer-feed-sync` (cron target)
- `/api/public/dealer/vehicles` (DMS push, feed_token auth)

**Provinces covered**: AMVIC (AB), OMVIC (ON), VSA (BC), OPD/OMVICQ (QC), MVDA (MB/SK), APSSA (NS). Regulator field is a single `dealer_license_number` with a `dealer_license_province` selector; format-validated per province.

---

## Suggested order

1. Phase 1 first (unblocks legally-safe dealer publishing) — ~1 turn
2. Phase 3.2 Speed-to-Lead (retention win, small surface) — ~1 turn
3. Phase 2 Feed Mapper (biggest UX + backend) — ~2 turns
4. Phase 3.1 Badge automation + expiry cron — ~1 turn

Reply **"go phase 1"** to start, or tell me to reorder / drop pieces.
