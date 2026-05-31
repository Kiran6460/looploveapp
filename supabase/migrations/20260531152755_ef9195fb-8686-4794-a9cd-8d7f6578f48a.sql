CREATE TABLE public.account_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  phone TEXT,
  reason TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.account_deletions TO service_role;

ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated; only service_role (which bypasses RLS) can access this log.
CREATE INDEX idx_account_deletions_deleted_at ON public.account_deletions (deleted_at DESC);