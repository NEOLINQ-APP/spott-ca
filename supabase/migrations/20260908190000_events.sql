-- Events module — Phase 3 spec section 16. Previously a "Coming Soon"
-- stub with zero backend. Mirrors marketplace_listings' conventions
-- closely (same status vocabulary shape, same photos/favorites pattern)
-- since that's the most similar existing content type: user-owned,
-- optionally business-affiliated, publicly browsable/searchable.

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  address text,
  city text,
  province text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  is_online boolean NOT NULL DEFAULT false,
  ticket_url text,
  price_cents integer,
  currency text NOT NULL DEFAULT 'CAD',
  capacity integer,
  -- Instant-publish, not moderated — matches marketplace_listings' real
  -- convention (DEFAULT 'active'), confirmed live: only business *profiles*
  -- go through admin review, user-generated content items (listings, and
  -- now events) self-serve. 'pending'/'rejected' stay in the vocabulary for
  -- a future moderation tool, they're just not the default anymore.
  status text NOT NULL DEFAULT 'published',
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_category_check CHECK (category IN (
    'music', 'sports', 'community', 'business', 'arts', 'food', 'family', 'charity', 'education', 'other'
  )),
  CONSTRAINT events_status_check CHECK (status IN (
    'draft', 'pending', 'published', 'completed', 'cancelled', 'rejected'
  )),
  CONSTRAINT events_capacity_check CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT events_price_check CHECK (price_cents IS NULL OR price_cents >= 0)
);

CREATE INDEX idx_events_status_start ON public.events(status, start_at);
CREATE INDEX idx_events_user ON public.events(user_id);
CREATE INDEX idx_events_city ON public.events(city);

GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT
  USING (status = 'published' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own events" ON public.events FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own events" ON public.events FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users delete own events" ON public.events FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Photos — mirrors marketplace_listing_photos/vehicle_photos exactly.
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_photos TO anon, authenticated;
GRANT INSERT, DELETE ON public.event_photos TO authenticated;
GRANT ALL ON public.event_photos TO service_role;

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event photos" ON public.event_photos FOR SELECT USING (true);
CREATE POLICY "Event owners manage own photos" ON public.event_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()));
CREATE POLICY "Event owners delete own photos" ON public.event_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()));

-- Favorites — mirrors vehicle_favorites/marketplace_favorites exactly.
CREATE TABLE public.event_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

GRANT SELECT, INSERT, DELETE ON public.event_favorites TO authenticated;
GRANT ALL ON public.event_favorites TO service_role;

ALTER TABLE public.event_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own event favorites" ON public.event_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users add own event favorites" ON public.event_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own event favorites" ON public.event_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- RSVPs — the spec's "get reminders"/attendance signal. going/interested,
-- same shape idea as a favorite but semantically distinct (RSVP is a real
-- commitment signal organizers can see; favorite is private bookmarking).
CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id),
  CONSTRAINT event_rsvps_status_check CHECK (status IN ('going', 'interested'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own RSVPs" ON public.event_rsvps FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Event owners view their event's RSVPs" ON public.event_rsvps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid()));
CREATE POLICY "Users manage own RSVPs" ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own RSVPs" ON public.event_rsvps FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own RSVPs" ON public.event_rsvps FOR DELETE
  USING (auth.uid() = user_id);
