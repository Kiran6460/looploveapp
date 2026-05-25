
-- Public read for avatars bucket
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Make sure profiles insert policy exists and is correct (id = auth.uid())
DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
