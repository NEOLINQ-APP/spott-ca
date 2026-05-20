
CREATE TABLE public.booking_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_clicks_business_time ON public.booking_clicks(business_id, clicked_at DESC);

ALTER TABLE public.booking_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a booking click"
  ON public.booking_clicks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners and admins view their clicks"
  ON public.booking_clicks
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = booking_clicks.business_id AND b.owner_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
