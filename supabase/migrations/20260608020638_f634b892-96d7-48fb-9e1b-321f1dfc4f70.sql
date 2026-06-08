
CREATE TABLE IF NOT EXISTS public.featured_placement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  source text NOT NULL CHECK (source IN ('homepage','search','directory','category','city','marketplace','other')),
  section text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fpe_biz_created ON public.featured_placement_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fpe_created ON public.featured_placement_events(created_at DESC);

GRANT INSERT ON public.featured_placement_events TO anon, authenticated;
GRANT SELECT ON public.featured_placement_events TO authenticated;
GRANT ALL ON public.featured_placement_events TO service_role;

ALTER TABLE public.featured_placement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert placement events"
  ON public.featured_placement_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can read events for their businesses"
  ON public.featured_placement_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = featured_placement_events.business_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all placement events"
  ON public.featured_placement_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
