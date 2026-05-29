-- Remove the overly broad policy that re-exposed sensitive columns
DROP POLICY IF EXISTS "profiles read others via view" ON public.profiles;

-- Recreate the view with security_invoker=off so it runs as its owner
-- and bypasses the base-table RLS. Only the safe columns are exposed.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
SELECT id, name, age, bio, photo_url, city, interests, created_at
FROM public.profiles
WHERE suspended = false;

GRANT SELECT ON public.profiles_public TO authenticated;
