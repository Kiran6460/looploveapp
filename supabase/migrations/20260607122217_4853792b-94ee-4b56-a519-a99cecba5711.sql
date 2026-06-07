
DROP TRIGGER IF EXISTS profiles_guard_verification ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_verification();

DROP POLICY IF EXISTS "swipes insert own" ON public.swipes;
CREATE POLICY "swipes insert own" ON public.swipes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = swiper_id);

DROP POLICY IF EXISTS "msgs insert own match" ON public.messages;
CREATE POLICY "msgs insert own match" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = messages.match_id
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

DROP FUNCTION IF EXISTS public.is_verified(uuid);
DROP TABLE IF EXISTS public.verification_reviews;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS verification_status,
  DROP COLUMN IF EXISTS verification_selfie_url,
  DROP COLUMN IF EXISTS verification_submitted_at,
  DROP COLUMN IF EXISTS verification_reviewed_at,
  DROP COLUMN IF EXISTS verification_rejection_reason,
  DROP COLUMN IF EXISTS liveness_score;
