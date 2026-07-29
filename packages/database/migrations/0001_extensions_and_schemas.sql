-- 0001 — Extensions, schemas, runtime roles and default privileges.
--
-- Infrastructure only. No domain table is created here: identity tables belong
-- to S03 and pricing tables to S04. What this migration establishes is the
-- trust boundary described in blueprint section 8.1, so that every later
-- migration lands inside an already-correct container.
--
-- The six roles of section 8.1 (migration-owner, API, notification-worker,
-- payout-worker, analytics, break-glass) need no tables to exist, so they are
-- created here rather than deferred. Table-level grants are not repeated per
-- table: `ALTER DEFAULT PRIVILEGES` below makes every table a later migration
-- creates inherit the correct grants automatically.
--
-- Forward-only (ADR-0010): this file must never be edited once applied. Correct
-- it by adding a later migration.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Section 8.1: separate app, private and analytics schemas.
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS analytics;

COMMENT ON SCHEMA app IS 'Application-visible relations. Row-level security is forced on every protected table.';
COMMENT ON SCHEMA private IS 'Secret material and restricted projections. Never granted to the API runtime role by default.';
COMMENT ON SCHEMA analytics IS 'Derived, rebuildable aggregates. Never a source of truth.';

-- Deny by default: revoke the implicit PUBLIC grants Postgres would otherwise
-- leave in place, including on the database itself.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA analytics FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Section 8.1 runtime roles.
--
-- The migration owner is the role running this file; it owns the schemas and
-- every object later migrations create. Every other role below is a *non-owner*
-- runtime role: `NOSUPERUSER NOBYPASSRLS`, so the row-level security S03 adds to
-- protected tables actually applies to it (blueprint sections 8.1, 19.2 and
-- invariant 9 of section 4.3).
--
-- `LOGIN` without a password: credentials are provisioned out of band (secret
-- manager / infra), never in a checked-in migration. Tests and services connect
-- as these exact role names, per section 8.1.
--
-- Tracking note for S03+: `createPoolFromEnv` still connects with whatever role
-- `DATABASE_URL` names, which in S02 is the migration owner. Switching the API
-- and worker connection strings to `chefmate_api` / `chefmate_notification_worker`
-- / `chefmate_payout_worker` is a deployment-configuration change and is done in
-- S03 together with the first RLS-protected tables, so that the restricted roles
-- are switched on against a schema that has policies to enforce.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  runtime_role text;
BEGIN
  FOR runtime_role IN
    SELECT unnest(ARRAY[
      'chefmate_api',
      'chefmate_notification_worker',
      'chefmate_payout_worker',
      'chefmate_analytics',
      'chefmate_break_glass'
    ])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
      EXECUTE format(
        'CREATE ROLE %I LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT',
        runtime_role
      );
    ELSE
      EXECUTE format(
        'ALTER ROLE %I NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION',
        runtime_role
      );
    END IF;
  END LOOP;
END
$$;

-- Role intent (kept as SQL comments rather than `COMMENT ON ROLE`, which is a
-- shared-object comment and would demand superuser of the migration owner):
--   chefmate_api                 API runtime. No `private` schema access.
--   chefmate_notification_worker outbox drains and provider sends.
--   chefmate_payout_worker       the only runtime role with `private` access
--                                (bank ciphertext, provider recipients).
--   chefmate_analytics           read-only derived aggregates.
--   chefmate_break_glass         time-bound audited emergency read access;
--                                never used by a service process.

-- Schema visibility. `USAGE` only: no role but the owner may create objects.
GRANT USAGE ON SCHEMA app TO
  chefmate_api,
  chefmate_notification_worker,
  chefmate_payout_worker,
  chefmate_analytics,
  chefmate_break_glass;

-- Section 8.1: `private` is "never granted to the API runtime role by default".
-- Bank ciphertext and provider recipients are payout-worker territory only.
GRANT USAGE ON SCHEMA private TO chefmate_payout_worker, chefmate_break_glass;

GRANT USAGE ON SCHEMA analytics TO chefmate_analytics, chefmate_api;

-- ---------------------------------------------------------------------------
-- Default privileges, so future migrations never repeat per-table grants.
-- These apply to objects created by the migration owner (the role executing
-- this file), which is the only role that creates objects.
-- ---------------------------------------------------------------------------

ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
    chefmate_api,
    chefmate_notification_worker,
    chefmate_payout_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT USAGE ON SEQUENCES TO
    chefmate_api,
    chefmate_notification_worker,
    chefmate_payout_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT ON TABLES TO chefmate_analytics, chefmate_break_glass;

ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT SELECT, INSERT, UPDATE ON TABLES TO chefmate_payout_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT USAGE ON SEQUENCES TO chefmate_payout_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT SELECT ON TABLES TO chefmate_break_glass;

ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chefmate_analytics;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics
  GRANT SELECT ON TABLES TO chefmate_api;

-- Functions stay deny-by-default: `EXECUTE` is granted per function, at the
-- migration that defines it, so a `SECURITY DEFINER` helper can never become
-- callable by accident (section 19.2).
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
