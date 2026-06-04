ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS exterior_color text;
CREATE INDEX IF NOT EXISTS idx_vehicles_condition ON public.vehicles (condition);
CREATE INDEX IF NOT EXISTS idx_vehicles_mileage ON public.vehicles (mileage_km);