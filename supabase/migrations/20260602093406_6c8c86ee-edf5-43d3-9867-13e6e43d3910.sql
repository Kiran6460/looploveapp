
-- 1) account_deletions: RLS enabled with no policy → add admin-only read; writes happen via service role.
CREATE POLICY "admins read deletions"
  ON public.account_deletions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Revoke EXECUTE on SECURITY DEFINER helpers from public API roles.
--    has_role / is_verified are invoked by RLS policies (run as table owner), so RLS keeps working.
--    guard_profile_verification is a trigger function and never needs direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_verified(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_verification() FROM PUBLIC, anon, authenticated;
