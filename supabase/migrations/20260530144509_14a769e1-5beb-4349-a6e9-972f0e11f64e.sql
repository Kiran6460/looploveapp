ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_len CHECK (char_length(content) BETWEEN 1 AND 2000);

ALTER TABLE public.reports
  ADD CONSTRAINT reports_status_valid CHECK (status IN ('pending','reviewed','dismissed','actioned'));

DROP POLICY IF EXISTS "reports insert own" ON public.reports;
CREATE POLICY "reports insert own"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND status = 'pending');