
-- Seed more automotive marketplace listings across Canada
DO $$
DECLARE
  v_cat uuid := '2aed1836-5ce2-461e-8040-67d86474c987'; -- vehicles
  v_user uuid := '3eb0a0fb-8c5b-42ba-b9b6-8c0f36c580d3';
  rec record;
  new_id uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('2020 Toyota RAV4 XLE AWD', 'Calgary', 'AB', 3289500, 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80'),
      ('2019 Ford F-150 XLT SuperCrew', 'Edmonton', 'AB', 3795000, 'https://images.unsplash.com/photo-1605893477799-b99e3b400a93?w=1200&q=80'),
      ('2017 Jeep Wrangler Unlimited Sport', 'Red Deer', 'AB', 2895000, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&q=80'),
      ('2021 Tesla Model 3 Long Range', 'Vancouver', 'BC', 4750000, 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80'),
      ('2018 Subaru Outback Touring', 'Victoria', 'BC', 2495000, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80'),
      ('2016 Mazda CX-5 GT AWD', 'Surrey', 'BC', 1795000, 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80'),
      ('2020 Hyundai Tucson Preferred', 'Winnipeg', 'MB', 2389000, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80'),
      ('2015 Chevrolet Silverado 1500 LT', 'Brandon', 'MB', 2195000, 'https://images.unsplash.com/photo-1591025207163-942350e47db2?w=1200&q=80'),
      ('2019 Nissan Rogue SV AWD', 'Moncton', 'NB', 2295000, 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80'),
      ('2017 Volkswagen Golf Comfortline', 'Saint John', 'NB', 1595000, 'https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=1200&q=80'),
      ('2018 Kia Sorento LX V6', 'St. John''s', 'NL', 2189000, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80'),
      ('2016 Honda CR-V EX-L', 'Halifax', 'NS', 1995000, 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80'),
      ('2020 Toyota Tacoma TRD Off-Road', 'Dartmouth', 'NS', 4189500, 'https://images.unsplash.com/photo-1591025207163-942350e47db2?w=1200&q=80'),
      ('2014 Ford Escape Titanium 4WD', 'Yellowknife', 'NT', 1389500, 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80'),
      ('2017 GMC Sierra 1500 SLE', 'Iqaluit', 'NU', 2789000, 'https://images.unsplash.com/photo-1605893477799-b99e3b400a93?w=1200&q=80'),
      ('2021 Mazda3 GT Hatchback', 'Toronto', 'ON', 2895000, 'https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=1200&q=80'),
      ('2019 Honda Pilot Touring 8-Pass', 'Mississauga', 'ON', 3895000, 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80'),
      ('2018 BMW 330i xDrive', 'Ottawa', 'ON', 2989000, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80'),
      ('2020 RAM 1500 Big Horn 4x4', 'Hamilton', 'ON', 4295000, 'https://images.unsplash.com/photo-1591025207163-942350e47db2?w=1200&q=80'),
      ('2015 Audi A4 Quattro', 'London', 'ON', 1789500, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80'),
      ('2019 Subaru Forester Sport', 'Charlottetown', 'PE', 2589000, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80'),
      ('2017 Mercedes-Benz C300 4MATIC', 'Montreal', 'QC', 2789000, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200&q=80'),
      ('2020 Volkswagen Atlas Comfortline', 'Quebec City', 'QC', 3489500, 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80'),
      ('2018 Toyota Corolla LE', 'Laval', 'QC', 1689000, 'https://images.unsplash.com/photo-1471444928139-48c5bf5173f8?w=1200&q=80'),
      ('2019 Ford Mustang GT Premium', 'Gatineau', 'QC', 3789000, 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200&q=80'),
      ('2016 Dodge Grand Caravan SXT', 'Regina', 'SK', 1389500, 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1200&q=80'),
      ('2020 Chevrolet Equinox LT AWD', 'Saskatoon', 'SK', 2589000, 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80'),
      ('2018 Ford Explorer XLT 4WD', 'Whitehorse', 'YT', 2895000, 'https://images.unsplash.com/photo-1568844293986-8d0400bd4745?w=1200&q=80')
    ) AS t(title, city, province, price_cents, img)
  LOOP
    new_id := gen_random_uuid();
    INSERT INTO public.marketplace_listings
      (id, user_id, category_id, title, description, price_cents, currency, condition, listing_type, city, province, status, tags)
    VALUES
      (new_id, v_user, v_cat, rec.title,
       'Well-maintained vehicle. Clean title, no accidents. Recent service. Open to inspection.',
       rec.price_cents, 'CAD', 'used', 'sale', rec.city, rec.province, 'active',
       ARRAY['vehicle','automotive','pickup']);
    INSERT INTO public.marketplace_listing_photos (listing_id, storage_path, sort_order)
    VALUES (new_id, rec.img, 0);
  END LOOP;
END $$;
