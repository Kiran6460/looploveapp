
DROP POLICY IF EXISTS "authenticated can use realtime" ON realtime.messages;

CREATE POLICY "user can subscribe to own match channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Per-match chat channels: messages-<match_uuid>
  (
    realtime.topic() ~ '^messages-[0-9a-fA-F-]{36}$'
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = substring(realtime.topic() from 10)::uuid
        AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  )
  -- Personal matches feed: shared topic, postgres_changes RLS filters rows
  OR realtime.topic() = 'matches-list'
);
