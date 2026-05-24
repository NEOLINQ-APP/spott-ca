ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS hours jsonb,
  ADD COLUMN IF NOT EXISTS price_tier smallint;

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_price_tier_range;
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_price_tier_range CHECK (price_tier IS NULL OR (price_tier BETWEEN 1 AND 5));