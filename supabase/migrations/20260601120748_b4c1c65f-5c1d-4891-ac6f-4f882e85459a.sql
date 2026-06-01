
CREATE OR REPLACE FUNCTION public.guard_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (server-side admin client) and admins bypass
  IF current_user = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at
     OR NEW.verification_rejection_reason IS DISTINCT FROM OLD.verification_rejection_reason
     OR NEW.verification_submitted_at IS DISTINCT FROM OLD.verification_submitted_at
     OR NEW.verification_selfie_url IS DISTINCT FROM OLD.verification_selfie_url
     OR NEW.liveness_score IS DISTINCT FROM OLD.liveness_score THEN
    RAISE EXCEPTION 'Cannot modify verification fields directly';
  END IF;
  RETURN NEW;
END;
$$;
