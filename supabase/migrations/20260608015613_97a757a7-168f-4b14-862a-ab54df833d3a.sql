
-- Add hidden flag for moderation
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS hidden_by uuid;

-- Update the public select policy to hide moderated reviews from non-owners/non-admins
DROP POLICY IF EXISTS "Reviews viewable by all" ON public.reviews;
CREATE POLICY "Reviews viewable by all"
ON public.reviews FOR SELECT
USING (
  is_hidden = false
  OR auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
);

-- Review reports table
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending', -- pending | reviewed | dismissed | actioned
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_review_reports_status ON public.review_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON public.review_reports(review_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_reports TO authenticated;
GRANT ALL ON public.review_reports TO service_role;

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report a review"
ON public.review_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters and admins can read reports"
ON public.review_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.review_reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.review_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
