GRANT USAGE ON TYPE public.app_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_verified(uuid) TO authenticated, anon;