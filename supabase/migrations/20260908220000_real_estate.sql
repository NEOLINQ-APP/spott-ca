-- Real estate module — Phase 3 spec section 19. Same conventions as
-- events.sql/jobs.sql: instant-publish, user-owned with an optional
-- business (realtor/agency) link, RLS-scoped.
--
-- One thing this spec section explicitly calls for that the other two
-- didn't: "Do not expose sensitive exact location information when the
-- listing owner chooses approximate location." approximate_location is a
-- real toggle the detail page honours — when true, the exact address and
-- precise lat/lng are never sent to the client at all (enforced by which
-- columns the route selects, not just hidden in the UI).

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  property_type text NOT NULL DEFAULT 'residential',
  listing_type text NOT NULL DEFAULT 'sale',
  price_cents bigint NOT NULL,
  bedrooms numeric(3,1),
  bathrooms numeric(3,1),
  square_feet integer,
  lot_size_sqft integer,
  address text,
  city text,
  province text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  approximate_location boolean NOT NULL DEFAULT false,
  virtual_tour_url text,
  amenities text[] NOT NULL DEFAULT '{}',
  agent_name text,
  agent_phone text,
  agent_email text,
  status text NOT NULL DEFAULT 'published',
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT properties_type_check CHECK (property_type IN ('residential', 'commercial', 'land', 'rental')),
  CONSTRAINT properties_listing_type_check CHECK (listing_type IN ('sale', 'rent')),
  CONSTRAINT properties_price_check CHECK (price_cents >= 0),
  CONSTRAINT properties_status_check CHECK (status IN ('draft', 'published', 'sold', 'rented', 'removed'))
);

CREATE INDEX idx_properties_status ON public.properties(status, created_at DESC);
CREATE INDEX idx_properties_user ON public.properties(user_id);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_type ON public.properties(property_type, listing_type);

GRANT SELECT ON public.properties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published properties" ON public.properties FOR SELECT
  USING (status = 'published' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own properties" ON public.properties FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own properties" ON public.properties FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users delete own properties" ON public.properties FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.property_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.property_photos TO authenticated;
GRANT ALL ON public.property_photos TO service_role;

ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view property photos" ON public.property_photos FOR SELECT USING (true);
CREATE POLICY "Property owners manage own photos" ON public.property_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()));
CREATE POLICY "Property owners delete own photos" ON public.property_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid()));

CREATE TABLE public.property_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

GRANT SELECT, INSERT, DELETE ON public.property_favorites TO authenticated;
GRANT ALL ON public.property_favorites TO service_role;

ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own property favorites" ON public.property_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users add own property favorites" ON public.property_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own property favorites" ON public.property_favorites FOR DELETE
  USING (auth.uid() = user_id);
