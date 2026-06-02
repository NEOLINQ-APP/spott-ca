
-- Marketplace categories
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  sort_order integer NOT NULL DEFAULT 0
);

GRANT SELECT ON public.marketplace_categories TO anon, authenticated;
GRANT ALL ON public.marketplace_categories TO service_role;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Marketplace categories viewable by all" ON public.marketplace_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage marketplace categories" ON public.marketplace_categories FOR ALL USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.marketplace_categories (slug, name, icon, sort_order) VALUES
  ('vehicles','Vehicles','Car',10),
  ('electronics','Electronics','Smartphone',20),
  ('home-garden','Home & Garden','Home',30),
  ('furniture','Furniture','Armchair',40),
  ('appliances','Appliances','Refrigerator',50),
  ('clothing','Clothing & Accessories','Shirt',60),
  ('baby-kids','Baby & Kids','Baby',70),
  ('sports-outdoors','Sports & Outdoors','Bike',80),
  ('toys-games','Toys & Games','Gamepad2',90),
  ('hobbies','Hobbies & Collectibles','Palette',100),
  ('tools','Tools','Wrench',110),
  ('musical-instruments','Musical Instruments','Music',120),
  ('books-movies','Books, Movies & Music','BookOpen',130),
  ('pets','Pet Supplies','PawPrint',140),
  ('jewelry-watches','Jewelry & Watches','Watch',150),
  ('health-beauty','Health & Beauty','Sparkles',160),
  ('business-industrial','Business & Industrial','Briefcase',170),
  ('real-estate','Real Estate','Building',180),
  ('free','Free Stuff','Gift',190),
  ('other','Other','Package',200);

-- Listings
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  condition text NOT NULL DEFAULT 'used' CHECK (condition IN ('new','like_new','used','for_parts')),
  listing_type text NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale','trade','free','wanted')),
  city text,
  province text DEFAULT 'ON',
  postal_code text,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','hidden','removed')),
  contact_email text,
  contact_phone text,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_listings_status_created ON public.marketplace_listings(status, created_at DESC);
CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings(category_id);
CREATE INDEX idx_marketplace_listings_user ON public.marketplace_listings(user_id);
CREATE INDEX idx_marketplace_listings_city ON public.marketplace_listings(city);

GRANT SELECT ON public.marketplace_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active listings viewable by all" ON public.marketplace_listings FOR SELECT
  USING (status = 'active' OR user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users insert own listings" ON public.marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own listings" ON public.marketplace_listings FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users delete own listings" ON public.marketplace_listings FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER set_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Photos
CREATE TABLE public.marketplace_listing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_photos_listing ON public.marketplace_listing_photos(listing_id, sort_order);

GRANT SELECT ON public.marketplace_listing_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketplace_listing_photos TO authenticated;
GRANT ALL ON public.marketplace_listing_photos TO service_role;

ALTER TABLE public.marketplace_listing_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listing photos viewable by all" ON public.marketplace_listing_photos FOR SELECT USING (true);
CREATE POLICY "Owners insert listing photos" ON public.marketplace_listing_photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND l.user_id = auth.uid()));
CREATE POLICY "Owners update listing photos" ON public.marketplace_listing_photos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND (l.user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))));
CREATE POLICY "Owners delete listing photos" ON public.marketplace_listing_photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.marketplace_listings l WHERE l.id = listing_id AND (l.user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))));

-- Favorites
CREATE TABLE public.marketplace_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;
GRANT ALL ON public.marketplace_favorites TO service_role;

ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own marketplace favorites" ON public.marketplace_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users add own marketplace favorites" ON public.marketplace_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own marketplace favorites" ON public.marketplace_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for marketplace photos
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-photos','marketplace-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Marketplace photos public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-photos');
CREATE POLICY "Users upload own marketplace photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own marketplace photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketplace-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own marketplace photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
