-- SPOTT Auto Phase 1 (part 2): partner/referral/tracking/financing-application
-- tables. Split into its own migration file after 20260830220500's ALTER TYPE
-- additions because a new enum value can't be referenced (e.g. inside a
-- has_role(...,'partner'::app_role) RLS policy below) in the same
-- transaction that added it — Postgres requires the ADD VALUE to commit
-- first. RLS follows the same convention as sponsored_listing_leads
-- (service-role writes for anything public-facing/insert-heavy, no anon
-- INSERT policy) and promoters (self-service INSERT/SELECT gated to the
-- owning user_id, admin has ALL via has_role()).

-- Partners: approved referrers. No Stripe Connect / payout fields yet —
-- real payouts are explicitly out of scope for this phase.
CREATE TABLE public.spott_auto_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  -- Generated app-side (SP- + 8 random alphanumeric, retry-on-collision loop
  -- mirroring updatePromoter's code-gen pattern) — the column just enforces
  -- uniqueness, it doesn't generate the value itself.
  referral_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.spott_auto_partners TO service_role;
ALTER TABLE public.spott_auto_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can apply as a partner"
  ON public.spott_auto_partners FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Partners view their own row"
  ON public.spott_auto_partners FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners update their own contact fields"
  ON public.spott_auto_partners FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status = (SELECT p.status FROM public.spott_auto_partners p WHERE p.id = spott_auto_partners.id)
  );
CREATE POLICY "Admins manage partners"
  ON public.spott_auto_partners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Referrals: one row per attributed click-through. session_id carries
-- pre-auth attribution (set from the /r/:code cookie) until referred_user_id
-- is filled in post-signup. No self-service INSERT/UPDATE policy — the
-- referral-click route and the post-auth attach function both write via the
-- service-role client, same reasoning as sponsored_listing_leads (keeps this
-- un-spammable and un-forgeable via direct table access).
CREATE TABLE public.spott_auto_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.spott_auto_partners(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  source text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attributed', 'expired')),
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT ALL ON public.spott_auto_referrals TO service_role;
ALTER TABLE public.spott_auto_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view their own referrals"
  ON public.spott_auto_referrals FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.spott_auto_partners WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Tracking events: the 8 event types from the spec. Insert-only from server
-- functions (service role) so a public /r/:code hit or a QR scan can't be
-- used to write arbitrary rows straight from the client.
CREATE TABLE public.spott_auto_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'referral_click', 'landing', 'application_started', 'application_submitted',
    'vehicle_viewed', 'financing_clicked', 'partner_share', 'qr_scan'
  )),
  partner_id uuid REFERENCES public.spott_auto_partners(id) ON DELETE CASCADE,
  referral_code text,
  campaign_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.spott_auto_tracking_events TO service_role;
ALTER TABLE public.spott_auto_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view their own tracking events"
  ON public.spott_auto_tracking_events FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.spott_auto_partners WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Financing applications: a real intake, not a resurrection of vehicle_leads
-- (a financing application isn't always tied to one already-listed vehicle,
-- and carries its own submitted->funded lifecycle). Deliberately no
-- credit/financial fields beyond basic contact + vehicle context this phase.
CREATE TABLE public.financing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.spott_auto_referrals(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.spott_auto_partners(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  city text,
  province text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'in_review', 'assigned_to_dealer', 'funded', 'declined'
  )),
  dealer_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.financing_applications TO service_role;
ALTER TABLE public.financing_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view applications from their own referrals"
  ON public.financing_applications FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.spott_auto_partners WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX idx_spott_auto_partners_user ON public.spott_auto_partners (user_id);
CREATE INDEX idx_spott_auto_partners_status ON public.spott_auto_partners (status);
CREATE INDEX idx_spott_auto_referrals_partner ON public.spott_auto_referrals (partner_id);
CREATE INDEX idx_spott_auto_referrals_code ON public.spott_auto_referrals (referral_code);
CREATE INDEX idx_spott_auto_referrals_session ON public.spott_auto_referrals (session_id);
CREATE INDEX idx_spott_auto_tracking_events_partner ON public.spott_auto_tracking_events (partner_id);
CREATE INDEX idx_spott_auto_tracking_events_type ON public.spott_auto_tracking_events (event_type);
CREATE INDEX idx_financing_applications_partner ON public.financing_applications (partner_id);
CREATE INDEX idx_financing_applications_referral ON public.financing_applications (referral_id);
CREATE INDEX idx_financing_applications_status ON public.financing_applications (status);
