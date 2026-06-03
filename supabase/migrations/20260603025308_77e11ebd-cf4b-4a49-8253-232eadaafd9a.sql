ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;