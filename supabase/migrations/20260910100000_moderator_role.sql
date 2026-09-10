-- Split into its own migration: Postgres doesn't allow a new enum value
-- to be used in the same transaction that added it.
ALTER TYPE app_role ADD VALUE 'moderator';
