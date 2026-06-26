
CREATE TABLE public.promoter_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','email','sms')),
  subject TEXT,
  body TEXT NOT NULL,
  coupon_code TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','read')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promoter_notifications_user ON public.promoter_notifications(user_id, created_at DESC);
CREATE INDEX idx_promoter_notifications_promoter ON public.promoter_notifications(promoter_id, created_at DESC);

GRANT SELECT, UPDATE ON public.promoter_notifications TO authenticated;
GRANT ALL ON public.promoter_notifications TO service_role;

ALTER TABLE public.promoter_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Promoters read own notifications"
  ON public.promoter_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Promoters mark own notifications read"
  ON public.promoter_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_promoter_notifications_updated_at
  BEFORE UPDATE ON public.promoter_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
