-- 1. Extend admin_coupons for multi-use, discount kinds, and promoter linking
ALTER TABLE public.admin_coupons
  ADD COLUMN IF NOT EXISTS max_uses integer,
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_kind text NOT NULL DEFAULT 'addon_grant',
  ADD COLUMN IF NOT EXISTS discount_value integer,
  ADD COLUMN IF NOT EXISTS promoter_id uuid,
  ADD COLUMN IF NOT EXISTS last_redeemed_at timestamptz;

-- Loosen old single-use-only columns: keep them, but they only fill on first redeem
-- (history lives in coupon_redemptions). No data migration needed.

-- 2. Promoters
CREATE TABLE IF NOT EXISTS public.promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  display_name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  website text,
  social_handle text,
  pitch text,
  commission_type text NOT NULL DEFAULT 'flat', -- 'flat' | 'percent'
  commission_value integer NOT NULL DEFAULT 500, -- cents (flat) or percent (1-100)
  payout_method text,
  payout_details text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'suspended'
  notes text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.promoters TO authenticated;
GRANT ALL ON public.promoters TO service_role;

ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promoters" ON public.promoters
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their promoter row" ON public.promoters
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can apply" ON public.promoters
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id = auth.uid() OR user_id IS NULL)
    AND status = 'pending'
  );

CREATE POLICY "Promoters update limited fields" ON public.promoters
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = (SELECT p.status FROM public.promoters p WHERE p.id = promoters.id));

CREATE TRIGGER promoters_set_updated_at
  BEFORE UPDATE ON public.promoters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Coupon redemptions log
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  code text NOT NULL,
  redeemed_by_user uuid NOT NULL,
  redeemed_by_business uuid,
  addon_type text NOT NULL,
  promoter_id uuid,
  commission_cents integer NOT NULL DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'void'
  commission_paid_at timestamptz,
  commission_payout_ref text,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx ON public.coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_promoter_idx ON public.coupon_redemptions (promoter_id);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx ON public.coupon_redemptions (redeemed_by_user);
-- prevent double-redeem of the same code by the same business
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_unique_business
  ON public.coupon_redemptions (coupon_id, redeemed_by_business)
  WHERE redeemed_by_business IS NOT NULL;

GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all redemptions" ON public.coupon_redemptions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their redemptions" ON public.coupon_redemptions
  FOR SELECT USING (redeemed_by_user = auth.uid());

CREATE POLICY "Promoters view their attributed redemptions" ON public.coupon_redemptions
  FOR SELECT USING (
    promoter_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins update redemptions" ON public.coupon_redemptions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
