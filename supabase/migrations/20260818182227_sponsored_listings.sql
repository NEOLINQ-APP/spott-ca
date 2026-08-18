-- Sponsored marketplace listings: curated/paid placements shown alongside
-- real peer-to-peer marketplace_listings, clearly labeled "Sponsored".
-- Unlike marketplace_listings (a real user selling a real item, with real
-- contact_email/contact_phone), these have no user_id/seller — clicking one
-- opens a lead-capture form instead of a normal listing/contact flow, so
-- interest is tracked without implying a specific contactable seller exists.
CREATE TABLE public.sponsored_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  video_url text,
  price_cents integer,
  currency text NOT NULL DEFAULT 'CAD',
  category_id uuid REFERENCES public.marketplace_categories(id),
  city text,
  province text,
  sponsor_name text,
  cta_label text NOT NULL DEFAULT 'Learn more',
  is_active boolean NOT NULL DEFAULT true,
  click_count integer NOT NULL DEFAULT 0,
  lead_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sponsored_listings TO service_role;
ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active sponsored listings viewable by all"
  ON public.sponsored_listings FOR SELECT
  USING (is_active = true);
CREATE POLICY "Admins manage sponsored listings"
  ON public.sponsored_listings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Leads captured when someone clicks a sponsored listing and submits
-- interest. Admin-only readable; no anon INSERT policy on purpose — all
-- writes go through a server function using the service-role client, so
-- this can't be spammed by direct anon table access.
CREATE TABLE public.sponsored_listing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_listing_id uuid NOT NULL REFERENCES public.sponsored_listings(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  message text,
  city text,
  province text,
  category_id uuid REFERENCES public.marketplace_categories(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sponsored_listing_leads TO service_role;
ALTER TABLE public.sponsored_listing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sponsored leads"
  ON public.sponsored_listing_leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sponsored_listings_active ON public.sponsored_listings (is_active, sort_order);
CREATE INDEX idx_sponsored_leads_listing ON public.sponsored_listing_leads (sponsored_listing_id);
CREATE INDEX idx_sponsored_leads_category ON public.sponsored_listing_leads (category_id);
