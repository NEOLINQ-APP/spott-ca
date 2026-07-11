
-- Enforce category taxonomy on marketplace listings.
-- Active/sold listings must have a valid category_id referencing marketplace_categories.
-- Draft/hidden listings may remain uncategorized until fixed.

CREATE OR REPLACE FUNCTION public.enforce_marketplace_listing_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Only enforce on publicly-visible statuses.
  IF NEW.status IN ('active', 'sold') THEN
    IF NEW.category_id IS NULL THEN
      RAISE EXCEPTION 'category_id is required for active/sold marketplace listings. Pick a parent category and (when available) a subcategory before publishing.';
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.marketplace_categories WHERE id = NEW.category_id)
      INTO v_exists;
    IF NOT v_exists THEN
      RAISE EXCEPTION 'category_id % does not reference a valid marketplace category.', NEW.category_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_marketplace_listing_category ON public.marketplace_listings;
CREATE TRIGGER trg_enforce_marketplace_listing_category
  BEFORE INSERT OR UPDATE OF category_id, status
  ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_listing_category();

-- Prevent category deletion from silently orphaning listings.
ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_category_id_fkey;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT marketplace_listings_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.marketplace_categories(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category_null
  ON public.marketplace_listings (created_at DESC)
  WHERE category_id IS NULL;
