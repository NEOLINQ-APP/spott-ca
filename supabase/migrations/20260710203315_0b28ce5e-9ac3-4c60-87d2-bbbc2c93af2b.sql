-- Stripe Connect Express fields on promoters
ALTER TABLE public.promoters
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoters_stripe_connect_account_id
  ON public.promoters(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Promoter payout requests (Stripe transfer / payout tracking)
CREATE TABLE IF NOT EXISTS public.promoter_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 5000),
  currency text NOT NULL DEFAULT 'CAD',
  status text NOT NULL DEFAULT 'requested',
  stripe_transfer_id text,
  stripe_payout_id text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz,
  notes text,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.promoter_payout_requests TO authenticated;
GRANT ALL ON public.promoter_payout_requests TO service_role;
ALTER TABLE public.promoter_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promoters read own payout requests"
  ON public.promoter_payout_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_id AND p.user_id = auth.uid()));
CREATE POLICY "promoters create own payout requests"
  ON public.promoter_payout_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.promoters p WHERE p.id = promoter_id AND p.user_id = auth.uid() AND p.status = 'approved'));
CREATE POLICY "admins manage payout requests"
  ON public.promoter_payout_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_promoter_payout_requests_updated_at
  BEFORE UPDATE ON public.promoter_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Dealer inventory feed imports (Feed Mapper)
CREATE TABLE IF NOT EXISTS public.dealer_feed_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  source_type text NOT NULL,               -- 'csv' | 'xml'
  original_filename text,
  row_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'mapping',  -- mapping | previewing | processing | complete | failed
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  headers text[] NOT NULL DEFAULT '{}',
  sample_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealer_feed_imports TO authenticated;
GRANT ALL ON public.dealer_feed_imports TO service_role;
ALTER TABLE public.dealer_feed_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers manage own feed imports"
  ON public.dealer_feed_imports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()));
CREATE POLICY "admins read feed imports"
  ON public.dealer_feed_imports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dealer_feed_imports_updated_at
  BEFORE UPDATE ON public.dealer_feed_imports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_dealer_feed_imports_business ON public.dealer_feed_imports(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promoter_payout_requests_promoter ON public.promoter_payout_requests(promoter_id, created_at DESC);