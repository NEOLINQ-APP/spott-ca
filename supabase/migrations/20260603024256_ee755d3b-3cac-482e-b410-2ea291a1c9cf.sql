
-- Orders
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  promoter_id uuid REFERENCES public.promoters(id) ON DELETE SET NULL,
  promoter_code text,
  status text NOT NULL DEFAULT 'pending',
  fulfillment text NOT NULL DEFAULT 'pickup',
  subtotal_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD',
  contact_email text,
  contact_phone text,
  shipping_address jsonb,
  notes text,
  environment text NOT NULL DEFAULT 'sandbox',
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketplace_orders_buyer ON public.marketplace_orders(buyer_id, created_at DESC);
CREATE INDEX idx_marketplace_orders_promoter ON public.marketplace_orders(promoter_id);
CREATE INDEX idx_marketplace_orders_status ON public.marketplace_orders(status);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_orders TO authenticated;
GRANT ALL ON public.marketplace_orders TO service_role;

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create own orders"
  ON public.marketplace_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers view own orders"
  ON public.marketplace_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers update own pending orders"
  ON public.marketplace_orders FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status = 'pending')
  WITH CHECK (buyer_id = auth.uid());

-- Order items
CREATE TABLE public.marketplace_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL,
  title text NOT NULL,
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  commission_cents integer NOT NULL DEFAULT 0,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.marketplace_order_items(order_id);
CREATE INDEX idx_order_items_seller ON public.marketplace_order_items(seller_id);
CREATE INDEX idx_order_items_listing ON public.marketplace_order_items(listing_id);

GRANT SELECT, INSERT ON public.marketplace_order_items TO authenticated;
GRANT ALL ON public.marketplace_order_items TO service_role;

ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers create order items for their orders"
  ON public.marketplace_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));

CREATE POLICY "Buyers and sellers view related items"
  ON public.marketplace_order_items FOR SELECT TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Disputes
CREATE TABLE public.marketplace_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reason text NOT NULL,
  details text,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_disputes_order ON public.marketplace_disputes(order_id);
CREATE INDEX idx_disputes_status ON public.marketplace_disputes(status);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_disputes TO authenticated;
GRANT ALL ON public.marketplace_disputes TO service_role;

ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer opens dispute on own order"
  ON public.marketplace_disputes FOR INSERT TO authenticated
  WITH CHECK (
    opened_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid())
  );

CREATE POLICY "Participants view disputes"
  ON public.marketplace_disputes FOR SELECT TO authenticated
  USING (
    opened_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_order_items i WHERE i.order_id = marketplace_disputes.order_id AND i.seller_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update disputes"
  ON public.marketplace_disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_marketplace_orders_updated
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_marketplace_disputes_updated
  BEFORE UPDATE ON public.marketplace_disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
