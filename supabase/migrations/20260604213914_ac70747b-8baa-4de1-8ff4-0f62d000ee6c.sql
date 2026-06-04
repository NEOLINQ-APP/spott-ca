-- Fix vehicle_leads INSERT policy to enforce user_id = auth.uid() for authenticated users
DROP POLICY IF EXISTS "Public can submit a vehicle lead" ON public.vehicle_leads;

CREATE POLICY "Anon can submit a vehicle lead"
  ON public.vehicle_leads
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated can submit a vehicle lead"
  ON public.vehicle_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow anon to view vehicle photos (vehicles are publicly browsable)
DROP POLICY IF EXISTS "Anyone can read vehicle photos" ON storage.objects;
CREATE POLICY "Anyone can read vehicle photos"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vehicle-photos');
