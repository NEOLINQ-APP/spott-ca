ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[];
CREATE INDEX IF NOT EXISTS idx_businesses_keywords ON public.businesses USING GIN(keywords);