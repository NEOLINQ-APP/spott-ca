
-- =========================================================================
-- STEP 1: Additive migration — attribution + unified financial layer
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- -------------------------------------------------------------------------
-- 1. REFERRALS  (attribution layer — independent from financial layer)
-- -------------------------------------------------------------------------
CREATE TABLE public.referrals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id        uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  referred_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code      text NOT NULL,
  source             text NOT NULL DEFAULT 'signup'
                     CHECK (source IN ('signup','promo_code','link_click','manual')),
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','expired','revoked')),
  first_touch_at     timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoters view own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (
    promoter_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid())
    OR referred_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage referrals"
  ON public.referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_referrals_promoter_id      ON public.referrals(promoter_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_code             ON public.referrals(referral_code);
CREATE INDEX idx_referrals_status           ON public.referrals(status);

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 2. PROMO_CODES  (unified: admin | business | promoter)
-- -------------------------------------------------------------------------
CREATE TABLE public.promo_codes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               citext NOT NULL UNIQUE,
  owner_type         text NOT NULL
                     CHECK (owner_type IN ('admin','business','promoter')),
  owner_id           uuid, -- nullable for platform/admin codes
  discount_type      text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value     integer NOT NULL CHECK (discount_value > 0),
  currency           text DEFAULT 'CAD',
  min_subtotal_cents integer NOT NULL DEFAULT 0,
  usage_limit        integer,
  usage_count        integer NOT NULL DEFAULT 0,
  per_user_limit     integer,
  starts_at          timestamptz,
  expires_at         timestamptz,
  status             text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','paused','expired','archived')),
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view active promo codes"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (status = 'active' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners manage their promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (owner_type = 'business' AND owner_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
    OR (owner_type = 'promoter' AND owner_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (owner_type = 'business' AND owner_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
    OR (owner_type = 'promoter' AND owner_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid()))
  );

CREATE INDEX idx_promo_codes_owner   ON public.promo_codes(owner_type, owner_id);
CREATE INDEX idx_promo_codes_status  ON public.promo_codes(status);
CREATE INDEX idx_promo_codes_expires ON public.promo_codes(expires_at);

CREATE TRIGGER trg_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 4. PAYOUTS  (single unified ledger — created before promoter_earnings
--    so promoter_earnings.payout_id FK resolves)
-- -------------------------------------------------------------------------
CREATE TABLE public.payouts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type     text NOT NULL CHECK (recipient_type IN ('business','promoter')),
  recipient_id       uuid NOT NULL,
  amount_cents       bigint NOT NULL CHECK (amount_cents >= 0),
  currency           text NOT NULL DEFAULT 'CAD',
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','paid','failed','canceled')),
  method             text,
  external_payout_id text,
  period_start       timestamptz,
  period_end         timestamptz,
  failure_reason     text,
  notes              text,
  metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients and admins view payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (recipient_type = 'business' AND recipient_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
    OR (recipient_type = 'promoter' AND recipient_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid()))
  );

CREATE POLICY "Admins manage payouts"
  ON public.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payouts_recipient  ON public.payouts(recipient_type, recipient_id);
CREATE INDEX idx_payouts_status     ON public.payouts(status);
CREATE INDEX idx_payouts_created_at ON public.payouts(created_at DESC);

CREATE TRIGGER trg_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 3. PROMOTER_EARNINGS  (only source of commission truth)
--    referral_id is NULLABLE — financial layer is independent of attribution.
-- -------------------------------------------------------------------------
CREATE TABLE public.promoter_earnings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id            uuid NOT NULL REFERENCES public.promoters(id) ON DELETE RESTRICT,
  order_id               uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  order_item_id          uuid REFERENCES public.marketplace_order_items(id) ON DELETE CASCADE,
  referral_id            uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  promo_code_id          uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  commission_rate_bps    integer CHECK (commission_rate_bps IS NULL OR commission_rate_bps >= 0),
  commission_amount_cents bigint NOT NULL CHECK (commission_amount_cents >= 0),
  currency               text NOT NULL DEFAULT 'CAD',
  status                 text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','available','paid','reversed','canceled')),
  source                 text NOT NULL DEFAULT 'referral'
                         CHECK (source IN ('referral','organic','admin_adjustment','promo_code','other')),
  available_at           timestamptz,
  payout_id              uuid REFERENCES public.payouts(id) ON DELETE SET NULL,
  notes                  text,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promoter_id, order_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoter_earnings TO authenticated;
GRANT ALL ON public.promoter_earnings TO service_role;

ALTER TABLE public.promoter_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoters view own earnings"
  ON public.promoter_earnings FOR SELECT TO authenticated
  USING (
    promoter_id IN (SELECT id FROM public.promoters WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins manage earnings"
  ON public.promoter_earnings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pe_promoter_id   ON public.promoter_earnings(promoter_id);
CREATE INDEX idx_pe_order_id      ON public.promoter_earnings(order_id);
CREATE INDEX idx_pe_order_item_id ON public.promoter_earnings(order_item_id);
CREATE INDEX idx_pe_referral_id   ON public.promoter_earnings(referral_id);
CREATE INDEX idx_pe_promo_code_id ON public.promoter_earnings(promo_code_id);
CREATE INDEX idx_pe_payout_id     ON public.promoter_earnings(payout_id);
CREATE INDEX idx_pe_status        ON public.promoter_earnings(status);
CREATE INDEX idx_pe_available_at  ON public.promoter_earnings(available_at);

CREATE TRIGGER trg_promoter_earnings_updated_at
  BEFORE UPDATE ON public.promoter_earnings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -------------------------------------------------------------------------
-- 5. Extend COUPON_REDEMPTIONS
-- -------------------------------------------------------------------------
ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type   text
    CHECK (source_type IN ('admin','business','promoter'));

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_promo_code_id
  ON public.coupon_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_source_type
  ON public.coupon_redemptions(source_type);

-- -------------------------------------------------------------------------
-- 6. Extend MARKETPLACE_ORDERS
-- -------------------------------------------------------------------------
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS promo_code_id        uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_total_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_id          uuid REFERENCES public.referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mo_promo_code_id ON public.marketplace_orders(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_mo_referral_id   ON public.marketplace_orders(referral_id);

-- -------------------------------------------------------------------------
-- 7. Extend PROFILES
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code     text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code  text,
  ADD COLUMN IF NOT EXISTS status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','deleted'));

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code    ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_code ON public.profiles(referred_by_code);
