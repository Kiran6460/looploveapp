-- Restrict column-level SELECT on profiles so sensitive fields are not readable
-- by other authenticated users. Owners access their own sensitive data via
-- server functions that use the service-role admin client.

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  name,
  age,
  bio,
  photo_url,
  city,
  interests,
  created_at,
  onboarded,
  suspended,
  verification_status,
  birthdate
) ON public.profiles TO authenticated;

-- Preserve write privileges (RLS still gates them to the owner).
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;