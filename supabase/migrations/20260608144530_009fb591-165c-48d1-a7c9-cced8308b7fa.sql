
-- Add hierarchy + homepage-featured flags to marketplace categories, then re-seed the new taxonomy.
ALTER TABLE public.marketplace_categories
  ADD COLUMN IF NOT EXISTS parent_slug TEXT REFERENCES public.marketplace_categories(slug) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_sort INTEGER;

CREATE INDEX IF NOT EXISTS marketplace_categories_parent_slug_idx ON public.marketplace_categories(parent_slug);
CREATE INDEX IF NOT EXISTS marketplace_categories_is_featured_idx ON public.marketplace_categories(is_featured) WHERE is_featured;

-- Wipe existing rows. Listings.category_id will be set to NULL by FK ON DELETE SET NULL.
DELETE FROM public.marketplace_categories;

-- Top-level categories (16)
INSERT INTO public.marketplace_categories (slug, name, icon, sort_order, is_featured, featured_sort) VALUES
  ('real-estate',         'Real Estate',          'Home',         10,  TRUE,  10),
  ('vehicles',            'Vehicles',             'Car',          20,  TRUE,  20),
  ('jobs',                'Jobs',                 'Briefcase',    30,  TRUE,  30),
  ('services',            'Services',             'Wrench',       40,  TRUE,  40),
  ('home-garden',         'Home & Garden',        'Sprout',       50,  TRUE,  60),
  ('electronics',         'Electronics',          'Smartphone',   60,  TRUE,  50),
  ('fashion-beauty',      'Fashion & Beauty',     'Shirt',        70,  TRUE,  70),
  ('baby-kids',           'Baby & Kids',          'Baby',         80,  FALSE, NULL),
  ('pets',                'Pets',                 'PawPrint',     90,  TRUE,  80),
  ('hobbies-recreation',  'Hobbies & Recreation', 'Palette',      100, TRUE,  90),
  ('food-restaurants',    'Food & Restaurants',   'UtensilsCrossed', 110, TRUE, 100),
  ('business-directory',  'Business Directory',   'Building2',    120, TRUE,  110),
  ('events',              'Events',               'CalendarDays', 130, TRUE,  120),
  ('education',           'Education',            'GraduationCap', 140, FALSE, NULL),
  ('health-wellness',     'Health & Wellness',    'HeartPulse',   150, FALSE, NULL),
  ('community',           'Community',            'Users',        160, FALSE, NULL);

-- Subcategories
INSERT INTO public.marketplace_categories (slug, name, parent_slug, sort_order) VALUES
  -- Real Estate
  ('homes-for-sale',         'Homes for Sale',           'real-estate', 10),
  ('homes-for-rent',         'Homes for Rent',           'real-estate', 20),
  ('commercial-properties',  'Commercial Properties',    'real-estate', 30),
  ('vacation-rentals',       'Vacation Rentals',         'real-estate', 40),
  ('room-rentals',           'Room Rentals',             'real-estate', 50),
  ('land-acreage',           'Land & Acreage',           'real-estate', 60),
  -- Vehicles
  ('cars',                   'Cars',                     'vehicles', 10),
  ('trucks',                 'Trucks',                   'vehicles', 20),
  ('suvs',                   'SUVs',                     'vehicles', 30),
  ('motorcycles',            'Motorcycles',              'vehicles', 40),
  ('rvs-campers',            'RVs & Campers',            'vehicles', 50),
  ('boats',                  'Boats',                    'vehicles', 60),
  ('auto-parts',             'Auto Parts',               'vehicles', 70),
  ('automotive-services',    'Automotive Services',      'vehicles', 80),
  -- Jobs
  ('full-time-jobs',         'Full-Time Jobs',           'jobs', 10),
  ('part-time-jobs',         'Part-Time Jobs',           'jobs', 20),
  ('remote-jobs',            'Remote Jobs',              'jobs', 30),
  ('skilled-trades',         'Skilled Trades',           'jobs', 40),
  ('hospitality',            'Hospitality',              'jobs', 50),
  ('healthcare-jobs',        'Healthcare',               'jobs', 60),
  ('general-labour',         'General Labour',           'jobs', 70),
  -- Services
  ('home-services',          'Home Services',            'services', 10),
  ('landscaping',            'Landscaping',              'services', 20),
  ('cleaning',               'Cleaning',                 'services', 30),
  ('moving-services',        'Moving Services',          'services', 40),
  ('plumbing',               'Plumbing',                 'services', 50),
  ('electrical',             'Electrical',               'services', 60),
  ('roofing',                'Roofing',                  'services', 70),
  ('handyman',               'Handyman',                 'services', 80),
  ('marketing-advertising',  'Marketing & Advertising',  'services', 90),
  ('web-design',             'Web Design',               'services', 100),
  ('it-services',            'IT Services',              'services', 110),
  -- Home & Garden
  ('furniture',              'Furniture',                'home-garden', 10),
  ('appliances',             'Appliances',               'home-garden', 20),
  ('home-decor',             'Home Decor',               'home-garden', 30),
  ('tools',                  'Tools',                    'home-garden', 40),
  ('building-materials',     'Building Materials',       'home-garden', 50),
  ('garden-outdoor',         'Garden & Outdoor',         'home-garden', 60),
  -- Electronics
  ('smartphones',            'Smartphones',              'electronics', 10),
  ('computers',              'Computers',                'electronics', 20),
  ('laptops',                'Laptops',                  'electronics', 30),
  ('tablets',                'Tablets',                  'electronics', 40),
  ('tvs',                    'TVs',                      'electronics', 50),
  ('audio-equipment',        'Audio Equipment',          'electronics', 60),
  ('gaming-consoles',        'Gaming Consoles',          'electronics', 70),
  ('smart-home-devices',     'Smart Home Devices',       'electronics', 80),
  -- Fashion & Beauty
  ('mens-clothing',          'Men''s Clothing',          'fashion-beauty', 10),
  ('womens-clothing',        'Women''s Clothing',        'fashion-beauty', 20),
  ('shoes',                  'Shoes',                    'fashion-beauty', 30),
  ('jewelry',                'Jewelry',                  'fashion-beauty', 40),
  ('watches',                'Watches',                  'fashion-beauty', 50),
  ('beauty-products',        'Beauty Products',          'fashion-beauty', 60),
  ('accessories',            'Accessories',              'fashion-beauty', 70),
  -- Baby & Kids
  ('baby-gear',              'Baby Gear',                'baby-kids', 10),
  ('toys',                   'Toys',                     'baby-kids', 20),
  ('childrens-clothing',     'Children''s Clothing',     'baby-kids', 30),
  ('strollers',              'Strollers',                'baby-kids', 40),
  ('car-seats',              'Car Seats',                'baby-kids', 50),
  -- Pets
  ('pet-supplies',           'Pet Supplies',             'pets', 10),
  ('pet-services',           'Pet Services',             'pets', 20),
  ('pet-adoption',           'Pet Adoption',             'pets', 30),
  ('grooming',               'Grooming',                 'pets', 40),
  -- Hobbies & Recreation
  ('sports-equipment',       'Sports Equipment',         'hobbies-recreation', 10),
  ('collectibles',           'Collectibles',             'hobbies-recreation', 20),
  ('musical-instruments',    'Musical Instruments',      'hobbies-recreation', 30),
  ('arts-crafts',            'Arts & Crafts',            'hobbies-recreation', 40),
  ('books',                  'Books',                    'hobbies-recreation', 50),
  ('camping-outdoor-gear',   'Camping & Outdoor Gear',   'hobbies-recreation', 60),
  -- Food & Restaurants
  ('restaurants',            'Restaurants',              'food-restaurants', 10),
  ('cafes',                  'Cafes',                    'food-restaurants', 20),
  ('catering',               'Catering',                 'food-restaurants', 30),
  ('food-trucks',            'Food Trucks',              'food-restaurants', 40),
  ('bakeries',               'Bakeries',                 'food-restaurants', 50),
  -- Business Directory
  ('local-businesses',       'Local Businesses',         'business-directory', 10),
  ('verified-businesses',    'Verified Businesses',      'business-directory', 20),
  ('featured-businesses',    'Featured Businesses',      'business-directory', 30),
  ('professional-services',  'Professional Services',    'business-directory', 40),
  -- Events
  ('community-events',       'Community Events',         'events', 10),
  ('concerts',               'Concerts',                 'events', 20),
  ('festivals',              'Festivals',                'events', 30),
  ('business-events',        'Business Events',          'events', 40),
  ('sports-events',          'Sports Events',            'events', 50),
  -- Education
  ('tutors',                 'Tutors',                   'education', 10),
  ('courses',                'Courses',                  'education', 20),
  ('training-programs',      'Training Programs',        'education', 30),
  ('workshops',              'Workshops',                'education', 40),
  -- Health & Wellness
  ('fitness',                'Fitness',                  'health-wellness', 10),
  ('personal-trainers',      'Personal Trainers',        'health-wellness', 20),
  ('nutrition',              'Nutrition',                'health-wellness', 30),
  ('wellness-services',      'Wellness Services',        'health-wellness', 40),
  ('healthcare-providers',   'Healthcare Providers',     'health-wellness', 50),
  -- Community
  ('lost-found',             'Lost & Found',             'community', 10),
  ('volunteer-opportunities','Volunteer Opportunities',  'community', 20),
  ('local-announcements',    'Local Announcements',      'community', 30),
  ('groups-clubs',           'Groups & Clubs',           'community', 40);
