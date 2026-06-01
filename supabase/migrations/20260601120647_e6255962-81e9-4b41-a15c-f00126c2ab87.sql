
-- 1) App role enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) Extend profiles with verification fields
ALTER TABLE public.profiles
  ADD COLUMN verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  ADD COLUMN verification_selfie_url text,
  ADD COLUMN verification_submitted_at timestamptz,
  ADD COLUMN verification_reviewed_at timestamptz,
  ADD COLUMN verification_rejection_reason text,
  ADD COLUMN liveness_score numeric;

-- 3) Helper: get current user's verification status (security definer to avoid recursion in RLS)
CREATE OR REPLACE FUNCTION public.is_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND verification_status = 'verified'
  )
$$;

-- 4) Prevent self-editing verification fields on profiles via trigger
CREATE OR REPLACE FUNCTION public.guard_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins / service_role to update anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Block users from changing verification-controlled fields
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at
     OR NEW.verification_rejection_reason IS DISTINCT FROM OLD.verification_rejection_reason THEN
    RAISE EXCEPTION 'Cannot modify verification status directly';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_verification();

-- 5) Tighten swipes + messages to verified users
DROP POLICY IF EXISTS "swipes insert own" ON public.swipes;
CREATE POLICY "swipes insert own" ON public.swipes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = swiper_id AND public.is_verified(auth.uid()));

DROP POLICY IF EXISTS "msgs insert own match" ON public.messages;
CREATE POLICY "msgs insert own match" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_verified(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

-- 6) verification_reviews audit log
CREATE TABLE public.verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approve', 'reject')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verification_reviews TO authenticated;
GRANT ALL ON public.verification_reviews TO service_role;

ALTER TABLE public.verification_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read reviews" ON public.verification_reviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7) Storage: private bucket for verification selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification', 'verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own verification selfie"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users read own verification selfie"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "users update own verification selfie"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
