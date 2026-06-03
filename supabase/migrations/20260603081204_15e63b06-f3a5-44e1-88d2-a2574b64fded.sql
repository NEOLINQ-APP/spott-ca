
CREATE TABLE public.marketplace_seller_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  item_count integer NOT NULL DEFAULT 0,
  method text,
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_seller_payouts TO authenticated;
GRANT ALL ON public.marketplace_seller_payouts TO service_role;

ALTER TABLE public.marketplace_seller_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seller payouts"
ON public.marketplace_seller_payouts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Sellers view own payouts"
ON public.marketplace_seller_payouts FOR SELECT TO authenticated
USING (seller_id = auth.uid());

ALTER TABLE public.marketplace_order_items
  ADD COLUMN payout_id uuid REFERENCES public.marketplace_seller_payouts(id) ON DELETE SET NULL;

CREATE INDEX idx_mp_order_items_payout ON public.marketplace_order_items(payout_id);
CREATE INDEX idx_mp_order_items_seller ON public.marketplace_order_items(seller_id);
CREATE INDEX idx_mp_seller_payouts_seller ON public.marketplace_seller_payouts(seller_id, paid_at DESC);
