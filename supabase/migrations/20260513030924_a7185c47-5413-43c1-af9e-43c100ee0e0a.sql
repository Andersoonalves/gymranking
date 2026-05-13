
-- 1) Storage policies for the private 'progress-photos' bucket: each user manages their own folder
CREATE POLICY "Users can view own progress photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own progress photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own progress photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own progress photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2) Lock down SECURITY DEFINER helpers used internally by RLS — they should not be callable
--    directly by the public API. find_group_by_invite_code is intentionally callable to support
--    invite-code lookup during signup, so we keep its grants.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_group_ids() FROM PUBLIC, anon, authenticated;

-- 3) Remove workouts from realtime publication — no client subscribes, and an open channel
--    would let any signed-in user receive cross-group events.
ALTER PUBLICATION supabase_realtime DROP TABLE public.workouts;
