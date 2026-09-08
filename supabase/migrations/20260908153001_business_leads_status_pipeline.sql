-- business_leads has been silently accumulating real rows since
-- 20260821154356_bario_crm_integration.sql with no way for a business
-- owner to actually work them: crm_sync_status only tracks outbound
-- webhook delivery, and no route/UI anywhere reads this table for an
-- owner. Adds the same status vocabulary vehicle_leads already uses, plus
-- a place for internal notes, so the existing SELECT-only RLS policy
-- finally has something worth building an inbox on top of.

ALTER TABLE public.business_leads
  ADD COLUMN status text NOT NULL DEFAULT 'new',
  ADD COLUMN owner_notes text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.business_leads
  ADD CONSTRAINT business_leads_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost'));

CREATE INDEX idx_business_leads_business_status ON public.business_leads(business_id, status);
