ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS dealer_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_dealer_business ON public.vehicles (dealer_business_id) WHERE dealer_business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON public.businesses (business_type) WHERE business_type IS NOT NULL;