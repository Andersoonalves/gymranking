-- Policies de storage.objects, extraídas das migrations do projeto.
-- Gerado uma vez a partir das migrations; se uma policy de storage mudar lá,
-- atualizar aqui também.
-- O `supabase db dump` não exporta o schema storage (é gerenciado), então
-- elas NÃO vêm no dump: sem isto, storage.objects fica sem policy nenhuma e
-- toda leitura de foto por usuário normal devolve 404 (o service_role passa,
-- o que faz o problema não aparecer em teste feito com a service key).

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own progress photos" ON storage.objects;
CREATE POLICY "Users can view own progress photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload own progress photos" ON storage.objects;
CREATE POLICY "Users can upload own progress photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own progress photos" ON storage.objects;
CREATE POLICY "Users can update own progress photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own progress photos" ON storage.objects;
CREATE POLICY "Users can delete own progress photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can upload own workout photos" ON storage.objects;
CREATE POLICY "Users can upload own workout photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workout-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own workout photos" ON storage.objects;
CREATE POLICY "Users can delete own workout photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workout-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Group mates can view workout photos" ON storage.objects;
CREATE POLICY "Group mates can view workout photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'workout-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT gm.user_id::text
      FROM public.group_members gm
      WHERE gm.group_id IN (SELECT private.get_my_group_ids())
    )
  );

