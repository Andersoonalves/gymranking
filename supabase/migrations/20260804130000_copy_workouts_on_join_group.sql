-- Treino é do usuário, não do grupo: ao entrar/criar um grupo, o histórico dele
-- tem que aparecer lá também. O registro novo já faz fan-out para todos os grupos
-- (useAddWorkouts); o que faltava era o retroativo.
-- ponytail: mantém uma cópia por grupo (design atual). Se a duplicação incomodar,
-- o caminho é tirar group_id de workouts e derivar o placar pelos membros do grupo.
CREATE OR REPLACE FUNCTION public.copy_workouts_to_new_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workouts (user_id, group_id, workout_type, workout_date, notes, photo_url)
  SELECT DISTINCT ON (w.workout_date, w.workout_type)
         NEW.user_id, NEW.group_id, w.workout_type, w.workout_date, w.notes, w.photo_url
  FROM public.workouts w
  WHERE w.user_id = NEW.user_id
    AND w.group_id <> NEW.group_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.workouts x
      WHERE x.user_id = NEW.user_id
        AND x.group_id = NEW.group_id
        AND x.workout_date = w.workout_date
        AND x.workout_type = w.workout_type
    )
  ORDER BY w.workout_date, w.workout_type, w.created_at;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_workouts_to_new_group() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS group_members_copy_workouts ON public.group_members;
CREATE TRIGGER group_members_copy_workouts
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_workouts_to_new_group();

-- Backfill dos grupos em que o usuário já entrou antes do trigger existir
INSERT INTO public.workouts (user_id, group_id, workout_type, workout_date, notes, photo_url)
SELECT DISTINCT ON (m.user_id, m.group_id, w.workout_date, w.workout_type)
       m.user_id, m.group_id, w.workout_type, w.workout_date, w.notes, w.photo_url
FROM public.group_members m
JOIN public.workouts w
  ON w.user_id = m.user_id
 AND w.group_id <> m.group_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.workouts x
  WHERE x.user_id = m.user_id
    AND x.group_id = m.group_id
    AND x.workout_date = w.workout_date
    AND x.workout_type = w.workout_type
)
ORDER BY m.user_id, m.group_id, w.workout_date, w.workout_type, w.created_at;
