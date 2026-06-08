
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS interior_color text,
  ADD COLUMN IF NOT EXISTS doors smallint,
  ADD COLUMN IF NOT EXISTS seats smallint,
  ADD COLUMN IF NOT EXISTS accident_history text,
  ADD COLUMN IF NOT EXISTS clean_title boolean,
  ADD COLUMN IF NOT EXISTS rebuilt_status boolean,
  ADD COLUMN IF NOT EXISTS financing_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_vehicles_hashtags ON public.vehicles USING gin (hashtags);
CREATE INDEX IF NOT EXISTS idx_vehicles_body_type ON public.vehicles (body_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel ON public.vehicles (fuel_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_transmission ON public.vehicles (transmission);
CREATE INDEX IF NOT EXISTS idx_vehicles_drivetrain ON public.vehicles (drivetrain);
