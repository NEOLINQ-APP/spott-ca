
-- Promoter engine hardening: discount %, auto-code linkage, P2P block, audit log

-- 1) Add customer_discount_pct to promoters (25..50) and helper columns
ALTER TABLE public.promoters
  ADD COLUMN IF NOT EXISTS customer_discount_pct integer,
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_code_str text;

-- Constrain commission_value to 10..30 and customer_discount_pct to 25..50 via trigger (avoid CHECK on time-dependent logic; keep simple range check via trigger for consistency)
CREATE OR REPLACE FUNCTION public.enforce_promoter_ranges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_type = 'percent' AND NEW.commission_value IS NOT NULL THEN
    IF NEW.commission_value < 10 OR NEW.commission_value > 30 THEN
      RAISE EXCEPTION 'Promoter commission_value must be between 10 and 30 (percent).';
    END IF;
  END IF;
  IF NEW.customer_discount_pct IS NOT NULL THEN
    IF NEW.customer_discount_pct < 25 OR NEW.customer_discount_pct > 50 THEN
      RAISE EXCEPTION 'Promoter customer_discount_pct must be between 25 and 50.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_promoter_ranges ON public.promoters;
CREATE TRIGGER trg_enforce_promoter_ranges
BEFORE INSERT OR UPDATE ON public.promoters
FOR EACH ROW EXECUTE FUNCTION public.enforce_promoter_ranges();

-- 2) Constrain promoter-owned coupon redemptions to subscription/featured-addon only.
-- If the coupon's owner_type = 'promoter', the redemption source_type must be one of the allowed scopes.
CREATE OR REPLACE FUNCTION public.enforce_promoter_code_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_type text;
BEGIN
  IF NEW.promo_code_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT owner_type INTO v_owner_type FROM public.promo_codes WHERE id = NEW.promo_code_id;
  IF v_owner_type = 'promoter' THEN
    IF COALESCE(NEW.source_type, '') NOT IN ('subscription', 'featured_addon') THEN
      RAISE EXCEPTION 'Promoter codes can only be applied to subscription invoices or featured add-ons (got source_type=%).', COALESCE(NEW.source_type, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_promoter_code_scope ON public.coupon_redemptions;
CREATE TRIGGER trg_enforce_promoter_code_scope
BEFORE INSERT OR UPDATE ON public.coupon_redemptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_promoter_code_scope();

-- 3) Admin audit log — records privileged mutations from the command center
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);

-- 4) Unique index on promoters.promo_code_str (case-insensitive) — safe for NULLs
CREATE UNIQUE INDEX IF NOT EXISTS uq_promoters_promo_code_str ON public.promoters (lower(promo_code_str)) WHERE promo_code_str IS NOT NULL;
