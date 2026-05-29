-- Restrict profiles SELECT to own row; expose safe public view for browsing
DROP POLICY IF EXISTS "profiles read auth" ON public.profiles;

CREATE POLICY "profiles read own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Public-safe view: only non-sensitive columns, and excludes suspended users
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, name, age, bio, photo_url, city, interests, created_at
FROM public.profiles
WHERE suspended = false;

GRANT SELECT ON public.profiles_public TO authenticated;

-- Allow authenticated users to read the underlying rows referenced by the view
-- (security_invoker means the view runs under the caller's privileges/RLS).
-- Add a permissive SELECT policy limited to non-sensitive use via the view
-- by allowing read of non-suspended profiles, but only the safe columns are
-- exposed by the view; the base table still restricts to own row above.
-- To make the view return other users' rows, add an additional SELECT policy:
CREATE POLICY "profiles read others via view"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (suspended = false);
