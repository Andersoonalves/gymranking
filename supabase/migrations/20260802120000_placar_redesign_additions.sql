-- Redesign "Placar": adições de schema (nada é removido).
-- 1. Curtidas (⚡) em treinos do feed do grupo.
-- 2. Vídeo do YouTube e anotações de execução por exercício.
-- 3. Meta semanal de treinos do usuário (anel no Início).

-- 1. workout_likes -----------------------------------------------------------

CREATE TABLE public.workout_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, user_id)
);

CREATE INDEX workout_likes_user_id_idx ON public.workout_likes (user_id);

ALTER TABLE public.workout_likes ENABLE ROW LEVEL SECURITY;

-- Quem participa do grupo do treino vê as curtidas dele.
CREATE POLICY "Members can view workout likes"
  ON public.workout_likes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
        AND w.group_id IN (SELECT private.get_my_group_ids())
    )
  );

-- Só curte em nome próprio, e só treinos de grupos onde participa.
CREATE POLICY "Members can like workouts in their groups"
  ON public.workout_likes
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
        AND w.group_id IN (SELECT private.get_my_group_ids())
    )
  );

CREATE POLICY "Users can remove own likes"
  ON public.workout_likes
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- 2. training_exercises: vídeo + anotações -----------------------------------

ALTER TABLE public.training_exercises
  ADD COLUMN video_url text,
  ADD COLUMN notes text;

-- 3. profiles: meta semanal ---------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN weekly_goal smallint NOT NULL DEFAULT 4
  CHECK (weekly_goal BETWEEN 1 AND 7);
