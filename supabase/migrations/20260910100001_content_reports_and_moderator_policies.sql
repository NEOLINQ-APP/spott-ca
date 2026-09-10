-- Phase 3: granular admin roles (Moderator) + general reports/moderation
-- for listings, per the user's own scope decision (Moderator: review
-- reports, hide/remove content, action verification requests — not
-- billing or site settings).

-- Real, pre-existing bug found while building this: "reviews" had no
-- admin bypass on UPDATE at all — only "Users can update own reviews"
-- (auth.uid() = user_id). adminModerateReview()'s hide/unhide action
-- calls this via the regular client, so it has likely never actually
-- worked for hiding someone ELSE's review (DELETE already had a real
-- admin bypass, so the "delete" action was fine — only hide/unhide was
-- broken). Fixed here, and moderator gets the same access.
DROP POLICY "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews, admins and moderators moderate any" ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY "Admins can update reports" ON public.review_reports;
CREATE POLICY "Admins and moderators can update reports" ON public.review_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY "Admins can delete reports" ON public.review_reports;
CREATE POLICY "Admins and moderators can delete reports" ON public.review_reports FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Defense-in-depth (reviewVerification() itself already uses the service
-- role, so this isn't strictly required for that function to work, but
-- keeps the RLS policy consistent with what a moderator can actually do
-- app-side).
DROP POLICY "Admins update verification requests" ON public.business_verification_requests;
CREATE POLICY "Admins and moderators update verification requests" ON public.business_verification_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- job_postings never had a moderation-removal status distinct from its
-- normal lifecycle (draft/published/closed) — "closed" means "no longer
-- accepting applications", not "removed for a policy violation". Adding
-- a real one rather than overloading "closed" for both meanings.
ALTER TABLE public.job_postings DROP CONSTRAINT job_postings_status_check;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text, 'removed'::text]));

-- New: general content reports, covering the 5 real listing types
-- (marketplace/vehicles/events/jobs/properties) — reviews already have
-- their own review_reports table, left as-is rather than merged in, to
-- avoid touching a working system for no real benefit.
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_type_check CHECK (content_type IN ('marketplace_listing', 'vehicle', 'event', 'job_posting', 'property')),
  CONSTRAINT content_reports_reason_check CHECK (reason IN ('spam', 'scam_or_fraud', 'prohibited_item', 'offensive_content', 'misleading_information', 'duplicate', 'other')),
  CONSTRAINT content_reports_status_check CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  UNIQUE (content_type, content_id, reporter_id)
);

CREATE INDEX idx_content_reports_status ON public.content_reports(status, created_at DESC);
CREATE INDEX idx_content_reports_content ON public.content_reports(content_type, content_id);

GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report content" ON public.content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Reporters and admins/moderators can read reports" ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Real, admin/moderator-only column-write protection matching the same
-- lesson as [[spott_ca_rls_column_writes_audit]] this session — pin the
-- content_reports UPDATE to admin/moderator only, everything else on
-- this table is insert-once from the reporter's side.
GRANT UPDATE ON public.content_reports TO authenticated;
CREATE POLICY "Admins and moderators update reports" ON public.content_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
