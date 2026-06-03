-- Vehicles core table
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_type text NOT NULL DEFAULT 'private' CHECK (seller_type IN ('private','dealer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','sold','removed','pending')),

  -- VIN + decoded
  vin text,
  year int,
  make text,
  model text,
  trim text,
  body_type text,
  engine text,
  transmission text,
  drivetrain text,
  fuel_type text,

  -- Listing
  title text NOT NULL,
  description text,
  features text[] DEFAULT '{}',
  mileage_km int,
  condition text CHECK (condition IN ('excellent','good','average','rough')),
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',

  -- Location
  city text,
  province text,
  postal_code text,

  -- Meta
  view_count int NOT NULL DEFAULT 0,
  featured_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_make_model ON public.vehicles(make, model);
CREATE INDEX idx_vehicles_year ON public.vehicles(year);
CREATE INDEX idx_vehicles_price ON public.vehicles(price_cents);
CREATE INDEX idx_vehicles_seller ON public.vehicles(seller_id);
CREATE INDEX idx_vehicles_created_at ON public.vehicles(created_at DESC);

GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active vehicles are public"
ON public.vehicles FOR SELECT
USING (status = 'active' OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own vehicle listings"
ON public.vehicles FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own vehicle listings"
ON public.vehicles FOR UPDATE
USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own vehicle listings"
ON public.vehicles FOR DELETE
USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vehicle photos
CREATE TABLE public.vehicle_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_photos_vehicle ON public.vehicle_photos(vehicle_id, sort_order);

GRANT SELECT ON public.vehicle_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_photos TO authenticated;
GRANT ALL ON public.vehicle_photos TO service_role;

ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicle photos are public"
ON public.vehicle_photos FOR SELECT USING (true);

CREATE POLICY "Sellers manage their vehicle photos"
ON public.vehicle_photos FOR ALL
USING (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_photos.vehicle_id AND (v.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_photos.vehicle_id AND v.seller_id = auth.uid()));

-- Storage policies for vehicle-photos bucket (bucket created separately)
CREATE POLICY "Vehicle photos publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Users upload own vehicle photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own vehicle photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own vehicle photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);