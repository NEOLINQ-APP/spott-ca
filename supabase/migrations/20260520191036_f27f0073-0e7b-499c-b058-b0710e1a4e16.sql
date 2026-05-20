
-- Backfill fallback hero images by category
UPDATE public.businesses b
SET hero_image_url = CASE c.slug
  WHEN 'restaurants-food' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80'
  WHEN 'beauty-personal-care' THEN 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80'
  WHEN 'health-wellness' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80'
  WHEN 'home-services' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80'
  WHEN 'automotive' THEN 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1200&q=80'
  WHEN 'professional-services' THEN 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80'
  WHEN 'shopping-retail' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80'
  WHEN 'events-entertainment' THEN 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'
  ELSE 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80'
END
FROM public.categories c
WHERE b.category_id = c.id
  AND b.status = 'approved'
  AND (b.hero_image_url IS NULL OR b.hero_image_url = '');

-- Seed category-based keywords for approved businesses missing keywords
UPDATE public.businesses b
SET keywords = CASE c.slug
  WHEN 'restaurants-food' THEN ARRAY['restaurant','food','dining','takeout','delivery','eat','meal','cuisine']
  WHEN 'beauty-personal-care' THEN ARRAY['beauty','salon','hair','haircut','nails','spa','barber','styling']
  WHEN 'health-wellness' THEN ARRAY['health','wellness','clinic','medical','fitness','therapy','doctor']
  WHEN 'home-services' THEN ARRAY['home','repair','cleaning','plumbing','electrical','handyman','renovation','contractor']
  WHEN 'automotive' THEN ARRAY['auto','car','mechanic','repair','tire','oil change','detailing','garage']
  WHEN 'professional-services' THEN ARRAY['professional','consulting','legal','accounting','tax','business','services']
  WHEN 'shopping-retail' THEN ARRAY['shop','shopping','store','retail','boutique','goods','merchandise']
  WHEN 'events-entertainment' THEN ARRAY['events','entertainment','party','wedding','catering','venue','music','dj']
  ELSE ARRAY[]::text[]
END
FROM public.categories c
WHERE b.category_id = c.id
  AND b.status = 'approved'
  AND (b.keywords IS NULL OR array_length(b.keywords, 1) IS NULL);

-- Add name-specific keywords for common business types (food)
UPDATE public.businesses SET keywords = keywords || ARRAY['ice cream','gelato','dessert','frozen yogurt','froyo','sundae','cone']
WHERE status='approved' AND (name ILIKE '%ice cream%' OR name ILIKE '%gelato%' OR name ILIKE '%dairy queen%' OR name ILIKE '%baskin%' OR name ILIKE '%marble slab%' OR name ILIKE '%coldstone%' OR name ILIKE '%menchie%' OR name ILIKE '%yogen%');

UPDATE public.businesses SET keywords = keywords || ARRAY['coffee','cafe','espresso','latte','tea']
WHERE status='approved' AND (name ILIKE '%coffee%' OR name ILIKE '%cafe%' OR name ILIKE '%starbucks%' OR name ILIKE '%tim hortons%' OR name ILIKE '%second cup%');

UPDATE public.businesses SET keywords = keywords || ARRAY['pizza','italian','pasta']
WHERE status='approved' AND (name ILIKE '%pizza%' OR name ILIKE '%pizzeria%');

UPDATE public.businesses SET keywords = keywords || ARRAY['burger','fast food','fries']
WHERE status='approved' AND (name ILIKE '%burger%' OR name ILIKE '%mcdonald%' OR name ILIKE '%wendy%' OR name ILIKE '%a&w%' OR name ILIKE '%harvey%' OR name ILIKE '%five guys%');

UPDATE public.businesses SET keywords = keywords || ARRAY['sushi','japanese','sashimi','ramen']
WHERE status='approved' AND (name ILIKE '%sushi%' OR name ILIKE '%japanese%' OR name ILIKE '%ramen%');

UPDATE public.businesses SET keywords = keywords || ARRAY['chinese','asian','dim sum','noodles']
WHERE status='approved' AND (name ILIKE '%chinese%' OR name ILIKE '%wok%' OR name ILIKE '%dynasty%' OR name ILIKE '%mandarin%');

UPDATE public.businesses SET keywords = keywords || ARRAY['indian','curry','tandoori','naan']
WHERE status='approved' AND (name ILIKE '%indian%' OR name ILIKE '%tandoor%' OR name ILIKE '%curry%' OR name ILIKE '%biryani%');

UPDATE public.businesses SET keywords = keywords || ARRAY['mexican','tacos','burrito']
WHERE status='approved' AND (name ILIKE '%mexican%' OR name ILIKE '%taco%' OR name ILIKE '%burrito%' OR name ILIKE '%chipotle%');

UPDATE public.businesses SET keywords = keywords || ARRAY['bakery','bread','pastry','cake']
WHERE status='approved' AND (name ILIKE '%bakery%' OR name ILIKE '%bake shop%' OR name ILIKE '%patisserie%');

UPDATE public.businesses SET keywords = keywords || ARRAY['tire','tires','wheels','rims']
WHERE status='approved' AND (name ILIKE '%tire%' OR name ILIKE '%kal tire%' OR name ILIKE '%canadian tire%');

UPDATE public.businesses SET keywords = keywords || ARRAY['mechanic','auto repair','oil change','brakes']
WHERE status='approved' AND (name ILIKE '%mechanic%' OR name ILIKE '%auto repair%' OR name ILIKE '%mr lube%' OR name ILIKE '%jiffy lube%' OR name ILIKE '%midas%');

UPDATE public.businesses SET keywords = keywords || ARRAY['car wash','detailing','clean','vacuum','wash']
WHERE status='approved' AND (name ILIKE '%car wash%' OR name ILIKE '%detail%');

UPDATE public.businesses SET keywords = keywords || ARRAY['gym','fitness','workout','yoga']
WHERE status='approved' AND (name ILIKE '%gym%' OR name ILIKE '%fitness%' OR name ILIKE '%goodlife%' OR name ILIKE '%yoga%' OR name ILIKE '%crossfit%');

UPDATE public.businesses SET keywords = keywords || ARRAY['dental','dentist','teeth','orthodontist']
WHERE status='approved' AND (name ILIKE '%dental%' OR name ILIKE '%dentist%' OR name ILIKE '%orthodont%');

UPDATE public.businesses SET keywords = keywords || ARRAY['pharmacy','drug store','prescription']
WHERE status='approved' AND (name ILIKE '%pharmacy%' OR name ILIKE '%shoppers drug%' OR name ILIKE '%rexall%' OR name ILIKE '%pharmaprix%');

UPDATE public.businesses SET keywords = keywords || ARRAY['grocery','supermarket','groceries']
WHERE status='approved' AND (name ILIKE '%loblaw%' OR name ILIKE '%sobey%' OR name ILIKE '%metro%' OR name ILIKE '%no frills%' OR name ILIKE '%food basics%' OR name ILIKE '%superstore%' OR name ILIKE '%save-on%' OR name ILIKE '%fortinos%' OR name ILIKE '%longo%' OR name ILIKE '%walmart%');
