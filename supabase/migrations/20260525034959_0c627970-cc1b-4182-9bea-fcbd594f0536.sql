
-- Features catalog
CREATE TABLE public.features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text,
  category text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Features viewable by all" ON public.features FOR SELECT USING (true);
CREATE POLICY "Admins manage features" ON public.features FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Business <-> features
CREATE TABLE public.business_features (
  business_id uuid NOT NULL,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  is_highlighted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, feature_id)
);
CREATE INDEX idx_business_features_business ON public.business_features(business_id);
CREATE INDEX idx_business_features_feature ON public.business_features(feature_id);
ALTER TABLE public.business_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business features viewable by all" ON public.business_features FOR SELECT USING (true);
CREATE POLICY "Owners manage their business features" ON public.business_features FOR ALL
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_features.business_id AND (b.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_features.business_id AND (b.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- Cap highlighted at 2
CREATE OR REPLACE FUNCTION public.enforce_highlight_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_highlighted THEN
    IF (SELECT count(*) FROM public.business_features WHERE business_id = NEW.business_id AND is_highlighted = true AND feature_id <> NEW.feature_id) >= 2 THEN
      RAISE EXCEPTION 'At most 2 highlighted features per business';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_highlight_cap BEFORE INSERT OR UPDATE ON public.business_features
  FOR EACH ROW EXECUTE FUNCTION public.enforce_highlight_cap();

-- Paid highlight window on businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS featured_highlights_until timestamptz;

-- Seed catalog
INSERT INTO public.features (slug, label, icon, category, sort_order) VALUES
  ('free_wifi','Free WiFi','Wifi','general',10),
  ('free_parking','Free Parking','Car','general',20),
  ('wheelchair_accessible','Wheelchair Accessible','Accessibility','general',30),
  ('family_friendly','Family Friendly','Users','general',40),
  ('pet_friendly','Pet Friendly','Dog','general',50),
  ('outdoor_seating','Outdoor Seating','Trees','general',60),
  ('air_conditioning','Air Conditioning','Snowflake','general',70),
  ('waiting_area','Waiting Area','Armchair','general',80),
  ('washrooms','Washrooms Available','Bath','general',90),
  ('walk_ins','Walk-Ins Welcome','DoorOpen','general',100),
  ('open_late','Open Late','Moon','general',110),
  ('open_247','24/7 Service','Clock','general',120),
  ('lgbtq_friendly','LGBTQ+ Friendly','Heart','general',130),
  ('happy_hour','Happy Hour','Wine','food',10),
  ('live_music','Live Music','Music','food',20),
  ('patio_seating','Patio Seating','Sun','food',30),
  ('takeout','Takeout','ShoppingBag','food',40),
  ('delivery','Delivery','Truck','food',50),
  ('dine_in','Dine-In','Utensils','food',60),
  ('catering','Catering','ChefHat','food',70),
  ('vegan','Vegan Options','Leaf','food',80),
  ('vegetarian','Vegetarian Options','Salad','food',90),
  ('halal','Halal Options','Star','food',100),
  ('gluten_free','Gluten-Free Options','Wheat','food',110),
  ('buffet','Buffet','UtensilsCrossed','food',120),
  ('private_dining','Private Dining','DoorClosed','food',130),
  ('kids_menu','Kids Menu','Baby','food',140),
  ('sports_tvs','Sports TVs','Tv','food',150),
  ('in_store_pickup','In-Store Pickup','PackageCheck','retail',10),
  ('online_ordering','Online Ordering','Globe','retail',20),
  ('same_day_delivery','Same-Day Delivery','Zap','retail',30),
  ('gift_cards','Gift Cards','Gift','retail',40),
  ('loyalty_rewards','Loyalty Rewards','Award','retail',50),
  ('financing','Financing Available','CreditCard','retail',60),
  ('custom_orders','Custom Orders','Pencil','retail',70),
  ('eco_friendly','Eco-Friendly Products','Recycle','retail',80),
  ('online_booking','Online Booking','CalendarCheck','beauty',10),
  ('walkin_appts','Walk-In Appointments','Footprints','beauty',20),
  ('spa_services','Spa Services','Sparkles','beauty',30),
  ('massage','Massage Therapy','HandMetal','beauty',40),
  ('hair_services','Hair Services','Scissors','beauty',50),
  ('nail_services','Nail Services','Hand','beauty',60),
  ('barber','Barber Services','Scissors','beauty',70),
  ('oil_changes','Oil Changes','Droplet','automotive',10),
  ('tire_services','Tire Services','CircleDot','automotive',20),
  ('car_wash','Car Wash','Sparkles','automotive',30),
  ('vehicle_inspections','Vehicle Inspections','ClipboardCheck','automotive',40),
  ('mobile_auto','Mobile Service','Truck','automotive',50),
  ('emergency_auto','Emergency Service','Siren','automotive',60),
  ('certified_techs','Certified Technicians','BadgeCheck','automotive',70),
  ('live_perf','Live Performances','Mic','entertainment',10),
  ('dj_events','DJ Events','Disc','entertainment',20),
  ('vip_area','VIP Area','Crown','entertainment',30),
  ('event_hosting','Event Hosting','PartyPopper','entertainment',40),
  ('private_events','Private Events','Lock','entertainment',50),
  ('birthday_pkg','Birthday Packages','Cake','entertainment',60),
  ('karaoke','Karaoke','Mic2','entertainment',70),
  ('free_estimates','Free Estimates','FileText','professional',10),
  ('emergency_pro','Emergency Services','Siren','professional',20),
  ('mobile_pro','Mobile Services','Truck','professional',30),
  ('virtual_consult','Virtual Consultations','Video','professional',40),
  ('licensed_insured','Licensed & Insured','ShieldCheck','professional',50),
  ('certified_pro','Certified Professionals','BadgeCheck','professional',60),
  ('personal_training','Personal Training','Dumbbell','fitness',10),
  ('group_classes','Group Classes','Users','fitness',20),
  ('sauna','Sauna','Flame','fitness',30),
  ('pool_access','Pool Access','Waves','fitness',40),
  ('membership_plans','Membership Plans','IdCard','fitness',50),
  ('free_trial','Free Trial','Gift','fitness',60),
  ('free_breakfast','Free Breakfast','Coffee','hotels',10),
  ('room_service','Room Service','BellRing','hotels',20),
  ('airport_shuttle','Airport Shuttle','Plane','hotels',30),
  ('gym_access','Gym Access','Dumbbell','hotels',40),
  ('hotel_pool','Pool','Waves','hotels',50),
  ('laundry','Laundry Service','Shirt','hotels',60),
  ('concierge','Concierge','ConciergeBell','hotels',70);
