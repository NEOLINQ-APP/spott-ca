-- SPOTT Auto Phase 1: partner/referral foundation for the vehicle-financing
-- lead-gen program. Each ALTER TYPE is its own statement — Postgres requires
-- a new enum value to be committed before it can be referenced elsewhere,
-- so these can't share a transaction block with the CREATE TABLEs below that
-- use them (kept in one migration file for changelog purposes; the Supabase
-- migration runner applies each statement in order, not as one transaction).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dealership';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dealership_user';
