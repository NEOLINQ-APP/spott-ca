
-- business_follows
CREATE TABLE public.business_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);
ALTER TABLE public.business_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows viewable by all" ON public.business_follows FOR SELECT USING (true);
CREATE POLICY "Users insert own follows" ON public.business_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own follows" ON public.business_follows FOR DELETE USING (auth.uid() = user_id);

-- review_likes
CREATE TABLE public.review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, review_id)
);
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by all" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "Users insert own likes" ON public.review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.review_likes FOR DELETE USING (auth.uid() = user_id);

-- business_views
CREATE TABLE public.business_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_views_user_time ON public.business_views(user_id, viewed_at DESC);
ALTER TABLE public.business_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own history" ON public.business_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.business_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own history" ON public.business_views FOR DELETE USING (auth.uid() = user_id);

-- owner_reply on reviews
ALTER TABLE public.reviews ADD COLUMN owner_reply text;
ALTER TABLE public.reviews ADD COLUMN owner_reply_at timestamptz;

-- allow business owners to update reply on reviews for their businesses
CREATE POLICY "Owners can reply to reviews" ON public.reviews FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = reviews.business_id AND b.owner_id = auth.uid()));
