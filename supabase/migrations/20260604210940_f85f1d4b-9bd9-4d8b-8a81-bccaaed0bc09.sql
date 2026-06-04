
-- Subscription plans (dealer tiers)
CREATE TYPE public.dealer_plan_tier AS ENUM ('starter', 'professional', 'premium');
CREATE TYPE public.dealer_subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'inactive');
CREATE TYPE public.promotion_kind AS ENUM ('featured', 'boosted');
CREATE TYPE public.promotion_target AS ENUM ('marketplace_listing', 'vehicle');
CREATE TYPE public.promotion_status AS ENUM ('pending', 'active', 'expired', 'canceled');

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier public.dealer_plan_tier NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  monthly_price_cents integer NOT NULL DEFAULT 0,
  yearly_price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  inventory_limit integer,
  featured_slots integer NOT NULL DEFAULT 0,
  boost_credits_monthly integer NOT NULL DEFAULT 0,
  lead_management boolean NOT NULL DEFAULT false,
  analytics_access boolean NOT NULL DEFAULT false,
  priority_support boolean NOT NULL DEFAULT false,
  custom_branding boolean NOT NULL DEFAULT false,
  api_access boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Dealer subscriptions
CREATE TABLE public.dealer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status public.dealer_subscription_status NOT NULL DEFAULT 'inactive',
  billing_interval text NOT NULL DEFAULT 'monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  boost_credits_remaining integer NOT NULL DEFAULT 0,
  stripe_subscription_id text,
  stripe_customer_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dealer_subscriptions_business ON public.dealer_subscriptions(business_id);
CREATE INDEX idx_dealer_subscriptions_status ON public.dealer_subscriptions(status);

GRANT SELECT, INSERT, UPDATE ON public.dealer_subscriptions TO authenticated;
GRANT ALL ON public.dealer_subscriptions TO service_role;
ALTER TABLE public.dealer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers view own subscription" ON public.dealer_subscriptions
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );
CREATE POLICY "Admins manage dealer subscriptions" ON public.dealer_subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_dealer_subscriptions_updated_at
  BEFORE UPDATE ON public.dealer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Promotion fields on marketplace_listings
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz,
  ADD COLUMN IF NOT EXISTS boost_score integer NOT NULL DEFAULT 0;

-- Promotion fields on vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS is_boosted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz,
  ADD COLUMN IF NOT EXISTS boost_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_featured ON public.marketplace_listings(is_featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_boosted ON public.marketplace_listings(is_boosted, boost_score DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_featured ON public.vehicles(is_featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_vehicles_boosted ON public.vehicles(is_boosted, boost_score DESC);

-- Unified promotions ledger
CREATE TABLE public.listing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type public.promotion_target NOT NULL,
  target_id uuid NOT NULL,
  owner_user_id uuid,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  kind public.promotion_kind NOT NULL,
  status public.promotion_status NOT NULL DEFAULT 'pending',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  source text NOT NULL DEFAULT 'admin_grant',
  granted_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_promotions_target ON public.listing_promotions(target_type, target_id);
CREATE INDEX idx_listing_promotions_status ON public.listing_promotions(status, ends_at);
CREATE INDEX idx_listing_promotions_owner ON public.listing_promotions(owner_user_id);

GRANT SELECT ON public.listing_promotions TO authenticated;
GRANT ALL ON public.listing_promotions TO service_role;
ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own promotions" ON public.listing_promotions
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR owner_user_id = auth.uid()
    OR (business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid()
    ))
  );
CREATE POLICY "Admins manage promotions" ON public.listing_promotions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_listing_promotions_updated_at
  BEFORE UPDATE ON public.listing_promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default plans
INSERT INTO public.subscription_plans
  (tier, name, description, monthly_price_cents, yearly_price_cents, inventory_limit, featured_slots, boost_credits_monthly, lead_management, analytics_access, priority_support, custom_branding, api_access, sort_order)
VALUES
  ('starter', 'Starter', 'Entry-level dealer plan for small inventories.', 4900, 49000, 25, 1, 2, true, false, false, false, false, 1),
  ('professional', 'Professional', 'Growing dealerships with active inventory and lead flow.', 14900, 149000, 100, 5, 10, true, true, false, true, false, 2),
  ('premium', 'Premium', 'High-volume dealerships with full analytics and priority support.', 29900, 299000, NULL, 20, 40, true, true, true, true, true, 3)
ON CONFLICT (tier) DO NOTHING;
