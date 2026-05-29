-- 1. Add column for extra-tag entitlement window
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS extra_tags_until timestamptz;

-- 2. Coupon codes table
CREATE TABLE public.admin_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  addon_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  expires_at timestamptz,
  created_by uuid NOT NULL,
  redeemed_by_user uuid,
  redeemed_by_business uuid,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_coupons_code ON public.admin_coupons (code);
CREATE INDEX idx_admin_coupons_status ON public.admin_coupons (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_coupons TO authenticated;
GRANT ALL ON public.admin_coupons TO service_role;

ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;

-- Only admins can view / manage coupon rows directly.
-- Redemption goes through a SECURITY DEFINER server function (supabaseAdmin).
CREATE POLICY "Admins view coupons"
  ON public.admin_coupons FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert coupons"
  ON public.admin_coupons FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update coupons"
  ON public.admin_coupons FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete coupons"
  ON public.admin_coupons FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));