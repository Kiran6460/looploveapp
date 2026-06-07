-- Defense-in-depth: split profiles SELECT so other users can only read safe
-- public columns, while sensitive columns are restricted to the owner and
-- service_role. RLS is row-level; column-level grants enforce the projection.

-- Reset column grants on profiles for the authenticated role.
REVOKE SELECT ON public.profiles FROM authenticated;

-- Public-discoverable columns: any authenticated user can read these (subject to RLS row policy).
GRANT SELECT (id, name, age, bio, photo_url, city, interests, created_at, onboarded, suspended, birthdate)
  ON public.profiles TO authenticated;

-- Sensitive columns (phone, suspended_reason, terms_accepted_at) are intentionally
-- NOT granted to authenticated. They are read only via server functions using the
-- service role, or by the owner through dedicated server functions.

GRANT ALL ON public.profiles TO service_role;

-- Replace the broad SELECT policy with two narrower policies that make intent explicit:
--   1. Owner can always read their own row (server fns acting as the user).
--   2. Other authenticated users can read non-suspended profiles (column grants above
--      restrict which columns are actually visible).
DROP POLICY IF EXISTS "profiles read" ON public.profiles;

CREATE POLICY "profiles read own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles read others public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (suspended = false AND auth.uid() <> id);
