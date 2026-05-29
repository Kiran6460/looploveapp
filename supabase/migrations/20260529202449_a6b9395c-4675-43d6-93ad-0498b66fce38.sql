-- Clean up previous attempt
DROP VIEW IF EXISTS public.profiles_public;
DROP POLICY IF EXISTS "profiles read own" ON public.profiles;

-- Column-level grants: only safe columns are readable by authenticated users.
-- Sensitive columns (suspended_reason, terms_accepted_at, birthdate) are NOT granted.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, age, bio, photo_url, city, interests, onboarded, suspended, created_at)
  ON public.profiles TO authenticated;

-- RLS policy: users can read their own row, plus any non-suspended user row.
CREATE POLICY "profiles read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR suspended = false);
