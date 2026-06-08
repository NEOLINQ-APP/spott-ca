
-- 1. Extend tier enum
ALTER TYPE public.dealer_plan_tier ADD VALUE IF NOT EXISTS 'enterprise';

-- 2. Extend subscription_plans with package-specific feature flags
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS multi_location_support boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_feed_imports boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_uploads boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_quota_per_vehicle integer,
  ADD COLUMN IF NOT EXISTS featured_placement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS founding_member_discount_pct integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_slug_key
  ON public.subscription_plans(slug) WHERE slug IS NOT NULL;

-- 3. Extend dealer_subscriptions for founding-dealer pricing lock + auto-renew
ALTER TABLE public.dealer_subscriptions
  ADD COLUMN IF NOT EXISTS is_founding_dealer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_monthly_price_cents integer,
  ADD COLUMN IF NOT EXISTS locked_yearly_price_cents integer,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method_on_file boolean NOT NULL DEFAULT false;
