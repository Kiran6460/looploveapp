-- Tighten profiles column-level grants: remove birthdate from the public projection
-- so only owner / service_role can read it. Phone, suspended_reason, terms_accepted_at
-- remain ungranted to `authenticated`.

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (id, name, age, bio, photo_url, city, interests, created_at, onboarded, suspended)
  ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;
