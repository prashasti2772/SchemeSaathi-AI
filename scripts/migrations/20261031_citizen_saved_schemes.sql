-- REVIEW ONLY until the owner explicitly approves this production schema change.
-- Run against the EXISTING verified PostgreSQL database; never change DATABASE_URL.
-- Existing users, profiles, tokens and catalogue records are untouched.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(724930128);

CREATE TABLE IF NOT EXISTS public.citizen_saved_schemes (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    scheme_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (user_id, scheme_id)
);

COMMIT;
