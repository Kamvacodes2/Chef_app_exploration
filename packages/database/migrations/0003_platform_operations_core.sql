-- 0003 - Platform operations core.
--
-- Adds the first durable identity, chef operations, notification, audit and
-- admin-reporting relations. Existing migrations are immutable; this forward
-- migration expands the schema on top of the purchase-flow tables from 0002.

ALTER TABLE app.outbox_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'legacy.event',
  ADD COLUMN IF NOT EXISTS correlation_id text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE INDEX outbox_events_claim_idx
  ON app.outbox_events(status, available_at, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE TABLE app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.user_roles (
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('CUSTOMER', 'CHEF', 'ADMIN', 'SUPPORT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX user_roles_role_idx ON app.user_roles(role, user_id);

CREATE TABLE app.rate_limit_buckets (
  key text PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts > 0),
  reset_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rate_limit_buckets_reset_idx ON app.rate_limit_buckets(reset_at);

CREATE TABLE app.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON app.sessions(user_id);
CREATE INDEX sessions_user_active_idx
  ON app.sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE app.chef_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email citext NOT NULL,
  phone text NOT NULL,
  city text,
  service_areas text[] NOT NULL DEFAULT '{}',
  experience text NOT NULL,
  status text NOT NULL DEFAULT 'APPLIED' CHECK (
    status IN ('APPLIED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_CONDUCTED', 'APPROVED', 'INVITED', 'REJECTED')
  ),
  interview_scheduled_at timestamptz,
  interview_conducted_at timestamptz,
  admin_notes text,
  invited_user_id uuid REFERENCES app.users(id),
  invited_at timestamptz,
  rejected_at timestamptz,
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chef_applications_status_idx ON app.chef_applications(status, applied_at DESC);
CREATE INDEX chef_applications_email_idx ON app.chef_applications(email);
CREATE INDEX chef_applications_invited_user_idx ON app.chef_applications(invited_user_id);

CREATE TABLE app.magic_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('CHEF_PORTAL_INVITE', 'PASSWORDLESS_LOGIN', 'SURVEY')),
  token_hash text NOT NULL UNIQUE,
  user_id uuid REFERENCES app.users(id) ON DELETE CASCADE,
  chef_application_id uuid REFERENCES app.chef_applications(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR chef_application_id IS NOT NULL)
);

CREATE INDEX magic_tokens_user_idx ON app.magic_tokens(user_id);
CREATE INDEX magic_tokens_application_idx ON app.magic_tokens(chef_application_id);
CREATE INDEX magic_tokens_active_idx
  ON app.magic_tokens(purpose, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE app.chef_profiles (
  user_id uuid PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
  is_available boolean NOT NULL DEFAULT false,
  service_area text,
  service_areas text[] NOT NULL DEFAULT '{}',
  bio text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  max_travel_km integer NOT NULL DEFAULT 20 CHECK (max_travel_km >= 0),
  availability jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chef_profiles_available_area_idx
  ON app.chef_profiles(is_available, service_area)
  WHERE is_available;
CREATE INDEX chef_profiles_available_area_lower_idx
  ON app.chef_profiles(is_available, (lower(service_area)))
  WHERE is_available AND service_area IS NOT NULL;
CREATE INDEX chef_profiles_service_areas_gin_idx ON app.chef_profiles USING gin (service_areas);

CREATE TABLE private.chef_bank_accounts (
  user_id uuid PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
  account_holder_ciphertext bytea NOT NULL,
  bank_name_ciphertext bytea NOT NULL,
  branch_code_ciphertext bytea NOT NULL,
  account_number_ciphertext bytea NOT NULL,
  account_type_ciphertext bytea,
  account_number_last4 text NOT NULL,
  key_version_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION app.current_chef_user_id(p_session_token text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = app, pg_temp
AS $$
  SELECT s.user_id
    FROM app.sessions AS s
    JOIN app.users AS u ON u.id = s.user_id
    JOIN app.user_roles AS r ON r.user_id = s.user_id AND r.role = 'CHEF'
   WHERE s.token_hash = encode(public.digest(p_session_token, 'sha256'), 'hex')
     AND s.revoked_at IS NULL
     AND s.expires_at > now()
     AND u.status = 'ACTIVE'
   LIMIT 1
$$;

CREATE FUNCTION app.get_chef_bank_account(p_session_token text)
RETURNS TABLE (
  user_id uuid,
  account_holder_ciphertext bytea,
  bank_name_ciphertext bytea,
  branch_code_ciphertext bytea,
  account_type_ciphertext bytea,
  account_number_last4 text,
  key_version_id text,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = private, app, pg_temp
AS $$
  SELECT account.user_id, account.account_holder_ciphertext, account.bank_name_ciphertext,
         account.branch_code_ciphertext, account.account_type_ciphertext,
         account.account_number_last4, account.key_version_id, account.updated_at
    FROM private.chef_bank_accounts AS account
   WHERE account.user_id = app.current_chef_user_id(p_session_token)
$$;

CREATE FUNCTION app.upsert_chef_bank_account(
  p_session_token text,
  p_account_holder_ciphertext bytea,
  p_bank_name_ciphertext bytea,
  p_branch_code_ciphertext bytea,
  p_account_number_ciphertext bytea,
  p_account_type_ciphertext bytea,
  p_account_number_last4 text,
  p_key_version_id text
)
RETURNS TABLE (
  user_id uuid,
  account_holder_ciphertext bytea,
  bank_name_ciphertext bytea,
  branch_code_ciphertext bytea,
  account_type_ciphertext bytea,
  account_number_last4 text,
  key_version_id text,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, app, pg_temp
AS $$
  INSERT INTO private.chef_bank_accounts AS account
     (user_id, account_holder_ciphertext, bank_name_ciphertext, branch_code_ciphertext,
      account_number_ciphertext, account_type_ciphertext, account_number_last4, key_version_id)
   SELECT authorized.user_id, $2, $3, $4, $5, $6, $7, $8
     FROM (SELECT app.current_chef_user_id($1) AS user_id) AS authorized
    WHERE authorized.user_id IS NOT NULL
   ON CONFLICT (user_id) DO UPDATE SET
     account_holder_ciphertext = EXCLUDED.account_holder_ciphertext,
     bank_name_ciphertext = EXCLUDED.bank_name_ciphertext,
     branch_code_ciphertext = EXCLUDED.branch_code_ciphertext,
     account_number_ciphertext = EXCLUDED.account_number_ciphertext,
     account_type_ciphertext = EXCLUDED.account_type_ciphertext,
     account_number_last4 = EXCLUDED.account_number_last4,
     key_version_id = EXCLUDED.key_version_id,
     updated_at = now()
   RETURNING account.user_id, account.account_holder_ciphertext, account.bank_name_ciphertext,
             account.branch_code_ciphertext, account.account_type_ciphertext,
             account.account_number_last4, account.key_version_id, account.updated_at
$$;

REVOKE ALL ON FUNCTION app.current_chef_user_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.get_chef_bank_account(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.upsert_chef_bank_account(text, bytea, bytea, bytea, bytea, bytea, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.get_chef_bank_account(text) TO chefmate_api;
GRANT EXECUTE ON FUNCTION app.upsert_chef_bank_account(text, bytea, bytea, bytea, bytea, bytea, text, text) TO chefmate_api;

CREATE TABLE app.chef_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  file_name text NOT NULL,
  storage_key text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (
    status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')
  ),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX chef_documents_chef_idx ON app.chef_documents(chef_user_id, uploaded_at DESC);

CREATE TABLE app.booking_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES app.bookings(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor text NOT NULL CHECK (actor IN ('SYSTEM', 'CUSTOMER', 'ADMIN', 'CHEF')),
  actor_user_id uuid REFERENCES app.users(id),
  note text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_transitions_booking_idx ON app.booking_transitions(booking_id, created_at);
CREATE INDEX booking_transitions_actor_idx ON app.booking_transitions(actor_user_id, created_at);

CREATE TABLE app.chef_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES app.bookings(id) ON DELETE CASCADE,
  chef_user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN')
  ),
  rank integer NOT NULL CHECK (rank >= 1),
  distance_km numeric(8,2),
  chef_payout_cents integer NOT NULL CHECK (chef_payout_cents >= 0),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, chef_user_id)
);

CREATE UNIQUE INDEX chef_offers_one_accepted_per_booking_idx
  ON app.chef_offers(booking_id)
  WHERE status = 'ACCEPTED';
CREATE INDEX chef_offers_chef_idx ON app.chef_offers(chef_user_id);
CREATE INDEX chef_offers_chef_pending_idx
  ON app.chef_offers(chef_user_id, expires_at)
  WHERE status = 'PENDING';

CREATE TABLE app.booking_assignments (
  booking_id uuid PRIMARY KEY REFERENCES app.bookings(id) ON DELETE CASCADE,
  chef_user_id uuid NOT NULL REFERENCES app.users(id),
  accepted_offer_id uuid NOT NULL REFERENCES app.chef_offers(id),
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_assignments_chef_idx ON app.booking_assignments(chef_user_id);
CREATE INDEX booking_assignments_offer_idx ON app.booking_assignments(accepted_offer_id);

CREATE TABLE app.chef_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES app.bookings(id) ON DELETE CASCADE,
  chef_user_id uuid NOT NULL REFERENCES app.users(id),
  gross_cents integer NOT NULL CHECK (gross_cents >= 0),
  chef_payout_cents integer NOT NULL CHECK (chef_payout_cents >= 0),
  platform_revenue_cents integer NOT NULL CHECK (platform_revenue_cents >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAYABLE', 'PAID', 'CANCELLED')),
  payout_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chef_earnings_chef_idx ON app.chef_earnings(chef_user_id, created_at DESC);

CREATE TABLE app.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_user_id uuid NOT NULL REFERENCES app.users(id),
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (
    status IN ('PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'PAID', 'FAILED')
  ),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  earning_ids uuid[] NOT NULL DEFAULT '{}',
  provider text,
  provider_reference text,
  approved_by_user_id uuid REFERENCES app.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payouts_chef_idx ON app.payouts(chef_user_id, created_at DESC);
CREATE INDEX payouts_approved_by_idx ON app.payouts(approved_by_user_id);

CREATE TABLE app.communication_consents (
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  purpose text NOT NULL CHECK (purpose IN ('TRANSACTIONAL', 'MARKETING')),
  granted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel, purpose)
);

CREATE TABLE app.communication_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  recipient text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, recipient)
);

CREATE UNIQUE INDEX communication_suppressions_channel_recipient_lower_idx
  ON app.communication_suppressions(channel, (lower(recipient)));

CREATE TABLE app.communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP')),
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'SKIPPED', 'FAILED')),
  recipient text NOT NULL,
  subject text,
  template_key text NOT NULL,
  body_preview text,
  provider text,
  provider_reference text,
  related_booking_id uuid REFERENCES app.bookings(id) ON DELETE SET NULL,
  related_user_id uuid REFERENCES app.users(id) ON DELETE SET NULL,
  metadata jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX communication_logs_created_idx ON app.communication_logs(created_at DESC);
CREATE INDEX communication_logs_related_booking_idx ON app.communication_logs(related_booking_id);
CREATE INDEX communication_logs_related_user_idx ON app.communication_logs(related_user_id);

CREATE TABLE app.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON app.notifications(user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
  ON app.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE app.survey_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  booking_id uuid NOT NULL REFERENCES app.bookings(id) ON DELETE CASCADE,
  customer_email citext NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'EXPIRED')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  answers jsonb,
  expires_at timestamptz NOT NULL,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX survey_tokens_booking_idx ON app.survey_tokens(booking_id);

CREATE TABLE app.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_idx ON app.audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx ON app.audit_log(actor_user_id, created_at DESC);

ALTER TABLE app.bookings
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_chef_user_id uuid,
  ADD COLUMN IF NOT EXISTS anonymous_caller_hash text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_id_fkey') THEN
    ALTER TABLE app.bookings
      ADD CONSTRAINT bookings_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES app.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_assigned_chef_user_id_fkey') THEN
    ALTER TABLE app.bookings
      ADD CONSTRAINT bookings_assigned_chef_user_id_fkey
      FOREIGN KEY (assigned_chef_user_id) REFERENCES app.users(id) NOT VALID;
  END IF;
END
$$;

CREATE INDEX bookings_customer_idx ON app.bookings(customer_id, created_at DESC);
CREATE INDEX bookings_assigned_chef_idx ON app.bookings(assigned_chef_user_id, scheduled_date);
-- Protected application relations are RLS-enabled and forced per ADR-0003. These
-- first-slice policies are role-bound; request/tenant-specific checks still live
-- in the API routes and security-definer helpers until the full auth/RLS matrix
-- lands in the dedicated authorization slice.
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_runtime_all ON app.users FOR ALL TO chefmate_api, chefmate_notification_worker, chefmate_payout_worker USING (true) WITH CHECK (true);
CREATE POLICY users_runtime_read ON app.users FOR SELECT TO chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY user_roles_runtime_all ON app.user_roles FOR ALL TO chefmate_api, chefmate_notification_worker, chefmate_payout_worker USING (true) WITH CHECK (true);
CREATE POLICY user_roles_runtime_read ON app.user_roles FOR SELECT TO chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rate_limit_buckets FORCE ROW LEVEL SECURITY;
CREATE POLICY rate_limit_buckets_api_all ON app.rate_limit_buckets FOR ALL TO chefmate_api USING (true) WITH CHECK (true);

ALTER TABLE app.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY sessions_runtime_all ON app.sessions FOR ALL TO chefmate_api USING (true) WITH CHECK (true);
CREATE POLICY sessions_payout_read ON app.sessions FOR SELECT TO chefmate_payout_worker, chefmate_break_glass USING (true);

ALTER TABLE app.chef_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chef_applications FORCE ROW LEVEL SECURITY;
CREATE POLICY chef_applications_runtime_all ON app.chef_applications FOR ALL TO chefmate_api USING (true) WITH CHECK (true);
CREATE POLICY chef_applications_worker_read ON app.chef_applications FOR SELECT TO chefmate_notification_worker, chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.magic_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.magic_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY magic_tokens_api_all ON app.magic_tokens FOR ALL TO chefmate_api, chefmate_notification_worker USING (true) WITH CHECK (true);
CREATE POLICY magic_tokens_break_glass_read ON app.magic_tokens FOR SELECT TO chefmate_break_glass USING (true);

ALTER TABLE app.chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chef_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY chef_profiles_runtime_all ON app.chef_profiles FOR ALL TO chefmate_api USING (true) WITH CHECK (true);
CREATE POLICY chef_profiles_worker_read ON app.chef_profiles FOR SELECT TO chefmate_notification_worker, chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.chef_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chef_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY chef_documents_api_all ON app.chef_documents FOR ALL TO chefmate_api USING (true) WITH CHECK (true);
CREATE POLICY chef_documents_worker_read ON app.chef_documents FOR SELECT TO chefmate_payout_worker, chefmate_break_glass USING (true);

ALTER TABLE app.booking_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.booking_transitions FORCE ROW LEVEL SECURITY;
CREATE POLICY booking_transitions_runtime_all ON app.booking_transitions FOR ALL TO chefmate_api, chefmate_payout_worker USING (true) WITH CHECK (true);
CREATE POLICY booking_transitions_worker_read ON app.booking_transitions FOR SELECT TO chefmate_notification_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.chef_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chef_offers FORCE ROW LEVEL SECURITY;
CREATE POLICY chef_offers_runtime_all ON app.chef_offers FOR ALL TO chefmate_api USING (true) WITH CHECK (true);
CREATE POLICY chef_offers_worker_read ON app.chef_offers FOR SELECT TO chefmate_notification_worker, chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.booking_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY booking_assignments_runtime_all ON app.booking_assignments FOR ALL TO chefmate_api USING (true) WITH CHECK (true);
CREATE POLICY booking_assignments_worker_read ON app.booking_assignments FOR SELECT TO chefmate_notification_worker, chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.chef_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chef_earnings FORCE ROW LEVEL SECURITY;
CREATE POLICY chef_earnings_runtime_all ON app.chef_earnings FOR ALL TO chefmate_api, chefmate_payout_worker USING (true) WITH CHECK (true);
CREATE POLICY chef_earnings_runtime_read ON app.chef_earnings FOR SELECT TO chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.payouts FORCE ROW LEVEL SECURITY;
CREATE POLICY payouts_runtime_all ON app.payouts FOR ALL TO chefmate_api, chefmate_payout_worker USING (true) WITH CHECK (true);
CREATE POLICY payouts_runtime_read ON app.payouts FOR SELECT TO chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.communication_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.communication_consents FORCE ROW LEVEL SECURITY;
CREATE POLICY communication_consents_runtime_all ON app.communication_consents FOR ALL TO chefmate_api, chefmate_notification_worker USING (true) WITH CHECK (true);
CREATE POLICY communication_consents_worker_read ON app.communication_consents FOR SELECT TO chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.communication_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.communication_suppressions FORCE ROW LEVEL SECURITY;
CREATE POLICY communication_suppressions_runtime_all ON app.communication_suppressions FOR ALL TO chefmate_api, chefmate_notification_worker USING (true) WITH CHECK (true);
CREATE POLICY communication_suppressions_worker_read ON app.communication_suppressions FOR SELECT TO chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.communication_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY communication_logs_runtime_all ON app.communication_logs FOR ALL TO chefmate_api, chefmate_notification_worker USING (true) WITH CHECK (true);
CREATE POLICY communication_logs_runtime_read ON app.communication_logs FOR SELECT TO chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY notifications_runtime_all ON app.notifications FOR ALL TO chefmate_api, chefmate_notification_worker USING (true) WITH CHECK (true);
CREATE POLICY notifications_runtime_read ON app.notifications FOR SELECT TO chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.survey_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY survey_tokens_runtime_all ON app.survey_tokens FOR ALL TO chefmate_api, chefmate_notification_worker USING (true) WITH CHECK (true);
CREATE POLICY survey_tokens_runtime_read ON app.survey_tokens FOR SELECT TO chefmate_payout_worker, chefmate_analytics, chefmate_break_glass USING (true);

ALTER TABLE app.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_log FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_log_runtime_all ON app.audit_log FOR ALL TO chefmate_api, chefmate_notification_worker, chefmate_payout_worker USING (true) WITH CHECK (true);
CREATE POLICY audit_log_runtime_read ON app.audit_log FOR SELECT TO chefmate_analytics, chefmate_break_glass USING (true);
