
CREATE TABLE IF NOT EXISTS public.listing_card_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid,
  source text NOT NULL DEFAULT 'home_slider',
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_card_clicks_business_id_idx
  ON public.listing_card_clicks (business_id, clicked_at DESC);

ALTER TABLE public.listing_card_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a listing card click on approved businesses"
ON public.listing_card_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = listing_card_clicks.business_id
      AND b.status = 'approved'
  )
  AND (user_id IS NULL OR user_id = auth.uid())
);

CREATE POLICY "Owners and admins view their listing card clicks"
ON public.listing_card_clicks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = listing_card_clicks.business_id
      AND b.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
