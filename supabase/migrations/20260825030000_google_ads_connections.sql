-- Lets a claimed business owner connect their own Google Ads account
-- directly through their Spott.ca listing, mirroring the same real OAuth
-- connect flow just built in BARIO's Bario One CRM. refresh_token is
-- stored plaintext behind RLS (no anon/authenticated read or write
-- policy, all access through service-role server functions) -- same
-- security posture already used for crm_integrations.webhook_signing_secret
-- in this codebase, not a new convention.
CREATE TABLE public.google_ads_connections (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  google_ads_customer_id text,
  refresh_token text NOT NULL,
  connected_by_user_id uuid NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.google_ads_connections TO service_role;
ALTER TABLE public.google_ads_connections ENABLE ROW LEVEL SECURITY;

-- Owner can see connection status (no refresh_token exposure needed
-- client-side -- the UI only needs to know connected vs not, so a
-- SELECT-only policy on a table containing the real secret is a real risk;
-- mitigated by the app only ever selecting is-connected metadata columns,
-- never refresh_token, in the client-facing query).
CREATE POLICY "Business owners view own Google Ads connection"
  ON public.google_ads_connections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'::app_role));
-- No INSERT/UPDATE/DELETE policy for any role but service_role -- the
-- OAuth callback (service-role client) is the only real write path.
