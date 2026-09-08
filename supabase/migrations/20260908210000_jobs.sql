-- Jobs module — Phase 3 spec section 17. Same conventions as events.sql:
-- instant-publish (matches marketplace_listings' real convention, not
-- moderated), user-owned with an optional business link, RLS-scoped.

CREATE TABLE public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  title text NOT NULL,
  description text,
  requirements text,
  benefits text,
  employment_type text NOT NULL DEFAULT 'full_time',
  location_type text NOT NULL DEFAULT 'onsite',
  city text,
  province text,
  salary_min_cents integer,
  salary_max_cents integer,
  salary_period text NOT NULL DEFAULT 'yearly',
  application_url text,
  application_email text,
  status text NOT NULL DEFAULT 'published',
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_postings_employment_type_check CHECK (employment_type IN (
    'full_time', 'part_time', 'contract', 'internship', 'temporary'
  )),
  CONSTRAINT job_postings_location_type_check CHECK (location_type IN ('onsite', 'remote', 'hybrid')),
  CONSTRAINT job_postings_salary_period_check CHECK (salary_period IN ('yearly', 'hourly')),
  CONSTRAINT job_postings_status_check CHECK (status IN ('draft', 'published', 'closed')),
  CONSTRAINT job_postings_salary_check CHECK (
    salary_min_cents IS NULL OR salary_max_cents IS NULL OR salary_min_cents <= salary_max_cents
  )
  -- No constraint requiring application_url/application_email — leaving
  -- both blank is a real, valid choice: it means "apply through Spott",
  -- handled by the job_applications table below, not an external link.
);

CREATE INDEX idx_job_postings_status ON public.job_postings(status, created_at DESC);
CREATE INDEX idx_job_postings_user ON public.job_postings(user_id);
CREATE INDEX idx_job_postings_city ON public.job_postings(city);

GRANT SELECT ON public.job_postings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.job_postings TO authenticated;
GRANT ALL ON public.job_postings TO service_role;

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published jobs" ON public.job_postings FOR SELECT
  USING (status = 'published' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create own job postings" ON public.job_postings FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own job postings" ON public.job_postings FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users delete own job postings" ON public.job_postings FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Applications — the spec's real "applicants can apply, track application"
-- ask. Contact info intentionally NOT exposed to the employer beyond what
-- the applicant's own profile already is (no separate PII columns here) —
-- the employer reaches out via the applicant's account, same trust model
-- as marketplace/dm messaging elsewhere on this platform.
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  cover_note text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id),
  CONSTRAINT job_applications_status_check CHECK (status IN ('submitted', 'reviewed', 'rejected', 'accepted'))
);

GRANT SELECT, INSERT ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants view own applications" ON public.job_applications FOR SELECT
  USING (auth.uid() = applicant_id);
CREATE POLICY "Employers view applications to their jobs" ON public.job_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.job_postings j WHERE j.id = job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users apply as themselves" ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Employers update application status on their jobs" ON public.job_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.job_postings j WHERE j.id = job_id AND j.user_id = auth.uid()));

-- Favorites — mirrors event_favorites/vehicle_favorites/marketplace_favorites.
CREATE TABLE public.job_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

GRANT SELECT, INSERT, DELETE ON public.job_favorites TO authenticated;
GRANT ALL ON public.job_favorites TO service_role;

ALTER TABLE public.job_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own job favorites" ON public.job_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users add own job favorites" ON public.job_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own job favorites" ON public.job_favorites FOR DELETE
  USING (auth.uid() = user_id);
