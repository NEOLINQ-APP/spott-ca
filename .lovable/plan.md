# Haiku Phase 1 — Build Plan

Goal: ship the foundation of Haiku (your AI assistant) on Spott.ca with a working chat, admin God Mode, founding member pricing, and PWA install. Background workers, phone/SMS, and social-media agents come in Phase 2.

## What you'll get at the end of Phase 1

1. **Public landing page** at `/haiku` — what Haiku is, what it does, pricing, founding member offer, CTA to start.
2. **Floating chat widget** site-wide (bottom-right bubble) — opens Haiku in any page.
3. **Full chat page** at `/haiku/chat` — threaded conversations, message history, markdown rendering.
4. **Role-aware brain**:
   - Guest → marketing/help mode
   - User → "help me post an ad, write a description, find a business"
   - Business owner → "draft a reply, summarize my reviews"
   - **Admin (you) → God Mode**: query the database, pull reports, manage records, get daily briefings
5. **Free quota + paywall**: 3 free AI uses (ad generation / image generation) per user, then subscription required.
6. **Founding member pricing & checkout** (Stripe embedded):
   - Personal: $4.99 / $9.99 / $19.99 / $39.99
   - Business: $39 / $89 / $149 / $249
   - Annual prepay = price locked for life
   - First 100 lifetime founders flag
7. **PWA install**: Spott.ca installable on Android/iOS home screen, Haiku icon included.
8. **Compliance shield basics**: CASL/PIPEDA disclaimer on outbound AI messages, AI-content labeling, audit log table.

## Architecture (technical section)

- All Haiku code isolated under `src/haiku/` (components, routes, server functions) → clean future migration to its own subdomain/VPS.
- DB tables prefixed `haiku_`:
  - `haiku_conversations` (threaded), `haiku_messages` (UIMessage parts)
  - `haiku_usage` (per-user free-credit counter)
  - `haiku_subscriptions` (tier, founding_member flag, price_locked)
  - `haiku_audit_log` (every admin God Mode action)
- Server function `src/haiku/chat.functions.ts` streams via Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Tool calling enabled:
  - User tools: `generate_ad_copy`, `generate_listing_image`, `suggest_price`, `find_business`
  - Admin tools (gated by `has_role(admin)`): `query_database`, `get_daily_report`, `update_listing_status`, `send_broadcast` (needsApproval)
- Pricing: Stripe Embedded Checkout, `managed_payments: true`, founding flag in metadata, annual = price lock.
- PWA: `manifest.webmanifest` + service worker via vite-plugin-pwa equivalent already supported.

## Out of scope for Phase 1 (saved for Phase 2)

- Phone answering (Twilio Voice)
- SMS outbound (Twilio SMS)
- Social media auto-posting / lead scraping
- Background "always-on" workers
- Stock research agent
- White-label reseller mode
- Native APK/iOS build (PWA covers install for now)

## Build order

1. DB migration (haiku_ tables + RLS + grants)
2. Stripe products for the 8 tiers + founding member flag
3. Server functions: chat stream, usage tracking, tool definitions
4. UI: `/haiku` landing, `/haiku/chat` page, floating bubble, pricing page, checkout
5. Admin God Mode panel inside chat (role-gated tools + audit log viewer)
6. PWA manifest + install prompt
7. Compliance footer + AI-labeled message badges

Approve and I'll start with step 1 (DB + Stripe) and ship through to a working chat + checkout in this turn.
