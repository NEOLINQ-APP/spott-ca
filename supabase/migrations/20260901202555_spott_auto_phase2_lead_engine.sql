-- SPOTT Auto Phase 2: Lead & Application Engine schema.
-- Extends financing_applications (Phase 1's closest match to the spec's
-- "Lead" entity) rather than replacing it, and adds the new tables the
-- customer application / consent / activity-timeline / Bario-sync /
-- lead-routing / partner-notification pieces need. Table is confirmed
-- empty in production, so column adds/constraint swaps below are safe.

-- Human-readable application code (SP-APP-2026-000001), distinct from the
-- internal uuid id which stays the real Lead ID. A single ever-incrementing
-- sequence (not reset per calendar year) — still globally unique and in the
-- spec's exact format, just simpler than a year-rollover trigger.
CREATE SEQUENCE public.application_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_application_code()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'SP-APP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.application_code_seq')::text, 6, '0');
$$;

-- campaigns: admin-curated list for UTM/campaign tracking (spec sections
-- 23, 40). Real rows only — no seeded fake campaigns.
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source text,
  medium text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active campaigns viewable by all"
  ON public.campaigns FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage campaigns"
  ON public.campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Extend financing_applications with the Lead fields the spec wants:
-- code, customer link, source/campaign attribution (captured once, never
-- overwritten — enforced in application code, not SQL), assignment, notes.
ALTER TABLE public.financing_applications
  ADD COLUMN application_code text UNIQUE NOT NULL DEFAULT public.generate_application_code(),
  ADD COLUMN customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN lead_source text CHECK (lead_source IN (
    'organic_search', 'direct', 'partner', 'qr_code', 'facebook', 'instagram',
    'tiktok', 'google_ads', 'campaign', 'referral', 'other'
  )),
  ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN utm_source text,
  ADD COLUMN utm_medium text,
  ADD COLUMN utm_campaign text,
  ADD COLUMN contact_preference text,
  ADD COLUMN assigned_salesperson text,
  ADD COLUMN notes text,
  ADD COLUMN last_activity_at timestamptz NOT NULL DEFAULT now();

-- Replace the Phase 1 outcome-oriented status set with the spec's
-- customer-journey status vocabulary. "completed" is a journey milestone,
-- never a stand-in for a lending approval — Spott itself never sets a
-- status that implies a credit decision.
ALTER TABLE public.financing_applications DROP CONSTRAINT financing_applications_status_check;
ALTER TABLE public.financing_applications ADD CONSTRAINT financing_applications_status_check CHECK (status IN (
  'submitted', 'received', 'under_review', 'contacted', 'dealership_assigned',
  'appointment_requested', 'appointment_set', 'in_progress', 'completed', 'cancelled'
));

-- vehicle_interest: what the customer is looking for. Not financially
-- sensitive — partners may see this (unlike financing_application_details).
CREATE TABLE public.vehicle_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  new_or_used text CHECK (new_or_used IN ('new', 'used', 'not_sure')),
  vehicle_type text,
  make text,
  model text,
  year integer,
  budget_cents integer,
  down_payment_cents integer,
  trade_in boolean NOT NULL DEFAULT false,
  payment_frequency text,
  preferred_dealership_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  not_sure_yet boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vehicle_interest TO service_role;
ALTER TABLE public.vehicle_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners and admins view vehicle interest for their leads"
  ON public.vehicle_interest FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.financing_applications fa
      JOIN public.spott_auto_partners p ON p.id = fa.partner_id
      WHERE fa.id = application_id AND p.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- financing_application_details: the SENSITIVE employment/income/housing
-- fields. Deliberately its own table (not jsonb on the lead) so
-- partner-facing queries can structurally never select it — masking by
-- construction, not by filtering. Admin-only SELECT, no partner policy at
-- all. Dealership access is Phase 3 (real dealership portal), not this phase.
CREATE TABLE public.financing_application_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  employment_status text,
  employer text,
  employment_duration text,
  income_cents integer,
  housing_status text,
  monthly_housing_payment_cents integer,
  drivers_license_status text,
  additional_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.financing_application_details TO service_role;
ALTER TABLE public.financing_application_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view financing details"
  ON public.financing_application_details FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- consent_records: real, versioned, per-category consent — no pre-checked
-- boxes, ever (enforced in the submit handler, not here). Admin-only read;
-- this is compliance data, not partner/customer-facing.
CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN (
    'application_submission', 'contact_permission', 'email_communication',
    'sms_communication', 'privacy_policy', 'terms_of_service'
  )),
  granted boolean NOT NULL,
  consent_version text NOT NULL,
  ip_address inet,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.consent_records TO service_role;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view consent records"
  ON public.consent_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- lead_activities: the real chronological timeline (spec sections 18-19),
-- populated at every real state change. is_internal gates admin-only notes
-- (e.g. internal review comments) out of partner/customer-visible views —
-- everyone sees real milestones, only admins see internal notes.
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  description text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view non-internal activity for their leads"
  ON public.lead_activities FOR SELECT
  USING (
    (is_internal = false AND EXISTS (
      SELECT 1 FROM public.financing_applications fa
      JOIN public.spott_auto_partners p ON p.id = fa.partner_id
      WHERE fa.id = application_id AND p.user_id = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Customers view non-internal activity for their own applications"
  ON public.lead_activities FOR SELECT
  USING (
    is_internal = false AND EXISTS (
      SELECT 1 FROM public.financing_applications fa
      WHERE fa.id = application_id AND fa.customer_id = auth.uid()
    )
  );

-- bario_sync_records: per-lead Bario One sync state (richer than the
-- webhook queue's own log — this is what admins/the Lead Center query).
-- Admin-only, matches spec section 14's "admin dashboard should display
-- failed synchronization records."
CREATE TABLE public.bario_sync_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.financing_applications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed', 'retrying')),
  bario_lead_id text,
  retry_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bario_sync_records TO service_role;
ALTER TABLE public.bario_sync_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view bario sync records"
  ON public.bario_sync_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- application_drafts: anonymous or logged-in save-and-continue. Never
-- localStorage for this data (spec section 28) — session_id is an
-- httpOnly-cookie-carried value, same pattern r.$code.tsx already uses.
-- One active draft per session or per user (partial unique indexes so
-- multiple NULLs on the other key are allowed).
CREATE TABLE public.application_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  partial_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.application_drafts TO service_role;
ALTER TABLE public.application_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own draft"
  ON public.application_drafts FOR SELECT
  USING (user_id = auth.uid());
CREATE UNIQUE INDEX idx_application_drafts_session ON public.application_drafts (session_id) WHERE session_id IS NOT NULL AND user_id IS NULL;
CREATE UNIQUE INDEX idx_application_drafts_user ON public.application_drafts (user_id) WHERE user_id IS NOT NULL;

-- lead_routing_rules: admin-configured auto-assignment, never hard-coded
-- in frontend code (spec section 15).
CREATE TABLE public.lead_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province text,
  city text,
  vehicle_type text,
  target_dealer_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_routing_rules TO service_role;
ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage routing rules"
  ON public.lead_routing_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- spott_auto_partner_notifications: mirrors promoters.functions.ts's
-- promoter_notifications shape exactly, scoped to spott_auto_partners.
-- email/sms channels are labeled but not actually dispatched (no SMS
-- infra exists anywhere in this app) — in_app is the only real delivery
-- this phase.
CREATE TABLE public.spott_auto_partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.spott_auto_partners(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms')),
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
  application_id uuid REFERENCES public.financing_applications(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.spott_auto_partner_notifications TO service_role;
ALTER TABLE public.spott_auto_partner_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners view their own notifications"
  ON public.spott_auto_partner_notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.spott_auto_partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));
CREATE POLICY "Partners mark their own notifications read"
  ON public.spott_auto_partner_notifications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.spott_auto_partners p WHERE p.id = partner_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.spott_auto_partners p WHERE p.id = partner_id AND p.user_id = auth.uid()));

-- social_platforms: editable config, seeded empty/inactive — real URLs get
-- filled in by an admin later, never invented (spec section 39).
CREATE TABLE public.social_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
  profile_url text,
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.social_platforms TO service_role;
ALTER TABLE public.social_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active social platforms viewable by all"
  ON public.social_platforms FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage social platforms"
  ON public.social_platforms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
INSERT INTO public.social_platforms (platform, profile_url, is_active) VALUES
  ('facebook', null, false),
  ('instagram', null, false),
  ('tiktok', null, false);

CREATE INDEX idx_financing_applications_customer ON public.financing_applications (customer_id);
CREATE INDEX idx_financing_applications_campaign ON public.financing_applications (campaign_id);
CREATE INDEX idx_financing_applications_source ON public.financing_applications (lead_source);
CREATE INDEX idx_lead_activities_application ON public.lead_activities (application_id, created_at DESC);
CREATE INDEX idx_bario_sync_records_status ON public.bario_sync_records (status) WHERE status IN ('pending', 'failed', 'retrying');
CREATE INDEX idx_lead_routing_rules_lookup ON public.lead_routing_rules (province, city, vehicle_type) WHERE active = true;
CREATE INDEX idx_spott_auto_partner_notifications_partner ON public.spott_auto_partner_notifications (partner_id, created_at DESC);
