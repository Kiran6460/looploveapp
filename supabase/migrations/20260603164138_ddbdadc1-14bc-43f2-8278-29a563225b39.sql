-- Restrict column-level privileges on profiles to prevent sensitive data exposure
-- and privilege escalation via direct UPDATE.

-- Remove broad SELECT/UPDATE on the whole table from the authenticated role.
REVOKE SELECT, UPDATE ON public.profiles FROM authenticated;

-- Re-grant SELECT only on the columns that are safe to expose to other
-- authenticated users (own row reads of sensitive fields go through
-- supabaseAdmin in server functions).
GRANT SELECT (
  id, name, age, bio, photo_url, city, interests, created_at,
  onboarded, verification_status, birthdate
) ON public.profiles TO authenticated;

-- Re-grant UPDATE only on user-editable profile fields. Moderation/verification
-- fields (suspended, suspended_reason, verification_status, verification_*,
-- liveness_score, phone, terms_accepted_at) are writable only by service_role
-- via server functions, never directly by the user.
GRANT UPDATE (
  name, age, bio, photo_url, city, interests, onboarded, birthdate
) ON public.profiles TO authenticated;

-- service_role keeps full access for server-side admin operations.
GRANT ALL ON public.profiles TO service_role;

-- ----- Realtime channel authorization -----
-- Enable RLS on realtime.messages and add a minimal authenticated-only policy
-- so anonymous clients cannot subscribe to broadcast/presence channels.
-- The app uses postgres_changes (which already enforces RLS on the underlying
-- public tables: messages, matches), so this does not regress current behavior.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can use realtime" ON realtime.messages;
CREATE POLICY "authenticated can use realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
