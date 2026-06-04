-- Business Directory: rename Automotive to disambiguate from the Vehicles vertical.
UPDATE public.categories SET name = 'Auto Services & Dealers' WHERE slug = 'automotive';

-- Business Directory: remove empty duplicates / future-vertical placeholders.
-- All confirmed at 0 rows in the audit.
DELETE FROM public.categories
WHERE slug IN (
  'health-medical',
  'entertainment-nightlife',
  'events-media',
  'fitness-sports',
  'education-training',
  'real-estate'
);

-- Marketplace: remove empty / overlapping buckets (Vehicles bucket left in place
-- per product decision pending the 41-listing migration review).
DELETE FROM public.marketplace_categories
WHERE slug IN ('real-estate', 'business-industrial', 'health-beauty');
