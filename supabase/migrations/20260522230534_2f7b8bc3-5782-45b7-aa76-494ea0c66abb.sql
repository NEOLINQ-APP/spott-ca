ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS ordering_links jsonb NOT NULL DEFAULT '{}'::jsonb;