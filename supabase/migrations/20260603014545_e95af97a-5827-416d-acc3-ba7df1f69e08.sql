-- Add tags column to marketplace listings (max 4 for free tier enforced in trigger)
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

-- Enforce tag cap (4) and normalize (lowercase, trimmed, max 24 chars each)
CREATE OR REPLACE FUNCTION public.mp_normalize_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned text[];
BEGIN
  IF NEW.tags IS NULL THEN
    NEW.tags := '{}'::text[];
  END IF;
  SELECT COALESCE(array_agg(DISTINCT t), '{}')
    INTO cleaned
  FROM (
    SELECT lower(btrim(regexp_replace(unnest(NEW.tags), '\s+', ' ', 'g'))) AS t
  ) s
  WHERE t <> '' AND length(t) <= 24;
  NEW.tags := cleaned;
  IF array_length(NEW.tags, 1) > 4 THEN
    RAISE EXCEPTION 'Free accounts can use up to 4 tags';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS mp_normalize_tags_trg ON public.marketplace_listings;
CREATE TRIGGER mp_normalize_tags_trg
BEFORE INSERT OR UPDATE OF tags ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.mp_normalize_tags();

-- Indexes for fast tag + fuzzy text search
CREATE INDEX IF NOT EXISTS idx_mp_listings_tags ON public.marketplace_listings USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_mp_listings_title_trgm ON public.marketplace_listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mp_listings_city_trgm ON public.marketplace_listings USING gin (city gin_trgm_ops);