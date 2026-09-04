-- Spec section 2 (Basic Information) explicitly requires postal code,
-- missed in the initial Phase 2 schema pass.
ALTER TABLE public.financing_applications ADD COLUMN postal_code text;
