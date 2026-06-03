-- Add new master categories for expanded marketplace taxonomy
INSERT INTO public.categories (slug, name, sort_order)
VALUES
  ('real-estate', 'Real Estate', 9),
  ('health-medical', 'Health & Medical', 10),
  ('entertainment-nightlife', 'Entertainment & Nightlife', 11),
  ('events-media', 'Events & Media', 12),
  ('fitness-sports', 'Fitness & Sports', 13),
  ('education-training', 'Education & Training', 14)
ON CONFLICT (slug) DO NOTHING;