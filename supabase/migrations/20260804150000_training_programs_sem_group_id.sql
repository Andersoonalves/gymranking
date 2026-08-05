-- Ficha de treino é do usuário, igual ao treino registrado: `training_programs.group_id`
-- sai, para a lista aparecer em qualquer grupo que a pessoa crie ou entre.
-- A UI sempre mostrou só as fichas próprias (filtro por user_id), então a
-- visibilidade fica restrita ao dono — nada de ficha de colega de grupo.

DROP POLICY IF EXISTS "Users can view programs in their groups" ON public.training_programs;
DROP POLICY IF EXISTS "Users can insert own programs" ON public.training_programs;
DROP POLICY IF EXISTS "Users can view exercises in their programs" ON public.training_exercises;

ALTER TABLE public.training_programs DROP COLUMN group_id;

CREATE POLICY "Users can view own programs"
  ON public.training_programs
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own programs"
  ON public.training_programs
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- O EXISTS já passa pela RLS de training_programs, que restringe ao dono.
CREATE POLICY "Users can view exercises in own programs"
  ON public.training_exercises
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.training_programs p WHERE p.id = program_id)
  );

CREATE INDEX IF NOT EXISTS training_programs_user_id_idx
  ON public.training_programs (user_id);
