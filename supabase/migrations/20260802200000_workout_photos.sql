-- Foto-prova opcional no registro de treino.
-- Diferente das fotos de progresso (privadas), a foto do treino é visível
-- para quem divide grupo com o autor — ela é a "prova" no feed.

ALTER TABLE public.workouts
  ADD COLUMN photo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-photos', 'workout-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Dono gerencia a própria pasta (user_id/...)
CREATE POLICY "Users can upload own workout photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'workout-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own workout photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'workout-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Quem divide grupo com o dono da foto pode vê-la (feed do grupo)
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
