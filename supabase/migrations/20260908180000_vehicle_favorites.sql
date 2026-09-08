-- Vehicles were the one content type with no favorite/save mechanism at
-- all — marketplace_listings has marketplace_favorites, businesses have
-- Follow (a different but comparable "save this" relationship), vehicles
-- had literally nothing. Mirrors marketplace_favorites' exact shape.

CREATE TABLE public.vehicle_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id)
);

GRANT SELECT, INSERT, DELETE ON public.vehicle_favorites TO authenticated;
GRANT ALL ON public.vehicle_favorites TO service_role;

ALTER TABLE public.vehicle_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vehicle favorites" ON public.vehicle_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users add own vehicle favorites" ON public.vehicle_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own vehicle favorites" ON public.vehicle_favorites FOR DELETE
  USING (auth.uid() = user_id);
