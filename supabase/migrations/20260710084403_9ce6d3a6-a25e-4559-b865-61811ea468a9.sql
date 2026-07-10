
-- Seller/buyer transaction ratings (peer-to-peer marketplace ratings)
CREATE TABLE public.seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.marketplace_orders(id) ON DELETE SET NULL,
  rater_id uuid NOT NULL,
  ratee_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer','seller')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_ratings_no_self CHECK (rater_id <> ratee_id)
);

CREATE INDEX idx_seller_ratings_ratee ON public.seller_ratings(ratee_id, created_at DESC);
CREATE INDEX idx_seller_ratings_listing ON public.seller_ratings(listing_id);
CREATE UNIQUE INDEX ux_seller_ratings_unique ON public.seller_ratings(rater_id, ratee_id, COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT ON public.seller_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_ratings TO authenticated;
GRANT ALL ON public.seller_ratings TO service_role;

ALTER TABLE public.seller_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings are publicly viewable"
  ON public.seller_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users insert their own ratings"
  ON public.seller_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users update their own ratings"
  ON public.seller_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users delete their own ratings"
  ON public.seller_ratings FOR DELETE TO authenticated
  USING (auth.uid() = rater_id);

CREATE TRIGGER seller_ratings_set_updated_at
  BEFORE UPDATE ON public.seller_ratings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mark-as-sold timestamp on listings
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS sold_to_user_id uuid;
