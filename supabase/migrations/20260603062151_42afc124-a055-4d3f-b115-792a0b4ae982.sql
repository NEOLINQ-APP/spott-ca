
CREATE TYPE public.vehicle_lead_type AS ENUM ('test_drive', 'trade_in', 'cash_offer', 'contact');
CREATE TYPE public.vehicle_lead_status AS ENUM ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost');

CREATE TABLE public.vehicle_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type public.vehicle_lead_type NOT NULL,
  status public.vehicle_lead_status NOT NULL DEFAULT 'new',
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  province TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  message TEXT,
  vin TEXT,
  year INT,
  make TEXT,
  model TEXT,
  trim TEXT,
  mileage_km INT,
  condition TEXT,
  asking_price_cents INT,
  ai_estimate_low_cents INT,
  ai_estimate_high_cents INT,
  ai_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_leads_status ON public.vehicle_leads(status);
CREATE INDEX idx_vehicle_leads_type ON public.vehicle_leads(lead_type);
CREATE INDEX idx_vehicle_leads_created ON public.vehicle_leads(created_at DESC);
CREATE INDEX idx_vehicle_leads_vehicle ON public.vehicle_leads(vehicle_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_leads TO authenticated;
GRANT INSERT ON public.vehicle_leads TO anon;
GRANT ALL ON public.vehicle_leads TO service_role;

ALTER TABLE public.vehicle_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
ON public.vehicle_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all leads"
ON public.vehicle_leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads"
ON public.vehicle_leads FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leads"
ON public.vehicle_leads FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own leads"
ON public.vehicle_leads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Vehicle sellers can view leads on their vehicles"
ON public.vehicle_leads FOR SELECT
TO authenticated
USING (
  vehicle_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.seller_id = auth.uid())
);

CREATE TRIGGER vehicle_leads_set_updated_at
BEFORE UPDATE ON public.vehicle_leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
