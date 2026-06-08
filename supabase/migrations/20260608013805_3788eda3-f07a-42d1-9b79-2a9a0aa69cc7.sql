
-- Featured Business framework
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS featured_sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured_tier text;

CREATE INDEX IF NOT EXISTS idx_businesses_featured_sections
  ON public.businesses USING gin (featured_sections);
CREATE INDEX IF NOT EXISTS idx_businesses_featured_priority
  ON public.businesses (featured_priority DESC) WHERE featured_until IS NOT NULL;

-- Application table
CREATE TABLE IF NOT EXISTS public.business_feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requested_tier text NOT NULL DEFAULT 'featured',
  requested_sections text[] NOT NULL DEFAULT '{}',
  message text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_feature_requests TO authenticated;
GRANT ALL ON public.business_feature_requests TO service_role;

ALTER TABLE public.business_feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners create own feature requests"
  ON public.business_feature_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.businesses b
                WHERE b.id = business_id AND b.owner_id = auth.uid()));

CREATE POLICY "Owners view own feature requests"
  ON public.business_feature_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update feature requests"
  ON public.business_feature_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bfr_set_updated_at BEFORE UPDATE ON public.business_feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
