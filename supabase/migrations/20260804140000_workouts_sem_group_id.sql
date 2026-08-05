-- Treino é do usuário, não do grupo. `workouts.group_id` sai e o placar do grupo
-- passa a derivar dos membros (função `group_workouts`). Assim o histórico aparece
-- em qualquer grupo que a pessoa crie ou entre, sem cópia por grupo.

-- Trigger/backfill de cópia da migration anterior não fazem mais sentido.
DROP TRIGGER IF EXISTS group_members_copy_workouts ON public.group_members;
DROP FUNCTION IF EXISTS public.copy_workouts_to_new_group();

-- 1. Cópias por grupo colapsam em uma linha só (a mais antiga de cada
--    user+data+tipo). Curtidas das cópias apontam para a linha mantida; as que
--    ficarem duplicadas morrem no CASCADE do DELETE abaixo.
UPDATE public.workout_likes l
SET workout_id = d.keep_id
FROM (
  SELECT w.id, k.id AS keep_id
  FROM public.workouts w
  JOIN (
    SELECT DISTINCT ON (user_id, workout_date, workout_type)
           id, user_id, workout_date, workout_type
    FROM public.workouts
    ORDER BY user_id, workout_date, workout_type, created_at, id
  ) k
    ON k.user_id = w.user_id
   AND k.workout_date = w.workout_date
   AND k.workout_type = w.workout_type
  WHERE w.id <> k.id
) d
WHERE l.workout_id = d.id
  AND NOT EXISTS (
    SELECT 1 FROM public.workout_likes l2
    WHERE l2.workout_id = d.keep_id AND l2.user_id = l.user_id
  );

DELETE FROM public.workouts w
USING (
  SELECT w2.id
  FROM public.workouts w2
  JOIN (
    SELECT DISTINCT ON (user_id, workout_date, workout_type)
           id, user_id, workout_date, workout_type
    FROM public.workouts
    ORDER BY user_id, workout_date, workout_type, created_at, id
  ) k
    ON k.user_id = w2.user_id
   AND k.workout_date = w2.workout_date
   AND k.workout_type = w2.workout_type
  WHERE w2.id <> k.id
) d
WHERE w.id = d.id;

-- 2. Policies que dependem de group_id precisam sair antes do DROP COLUMN.
DROP POLICY IF EXISTS "Users can view workouts in their groups" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Members can view workout likes" ON public.workout_likes;
DROP POLICY IF EXISTS "Members can like workouts in their groups" ON public.workout_likes;

ALTER TABLE public.workouts DROP COLUMN group_id;

-- 3. Visibilidade agora é por convivência de grupo: eu e quem divide grupo comigo.
--    SECURITY DEFINER para não recursionar em group_members sob RLS.
CREATE OR REPLACE FUNCTION private.get_my_peer_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT gm2.user_id
  FROM public.group_members gm1
  JOIN public.group_members gm2 ON gm2.group_id = gm1.group_id
  WHERE gm1.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION private.get_my_peer_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_peer_ids() TO authenticated;

CREATE POLICY "Users can view own and group mates workouts"
  ON public.workouts
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR user_id IN (SELECT private.get_my_peer_ids())
  );

CREATE POLICY "Users can insert own workouts"
  ON public.workouts
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Curtida segue a visibilidade do treino: o EXISTS já passa pela RLS de workouts.
CREATE POLICY "Members can view workout likes"
  ON public.workout_likes
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id));

CREATE POLICY "Members can like visible workouts"
  ON public.workout_likes
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id)
  );

-- 4. Índice que serve as duas leituras quentes: histórico meu e placar do grupo
--    (filtro por user_id + ordem por data).
CREATE INDEX IF NOT EXISTS workouts_user_id_workout_date_idx
  ON public.workouts (user_id, workout_date DESC);

-- 5. Placar do grupo em uma ida ao banco. SECURITY INVOKER: a RLS de
--    group_members e de workouts continua valendo, então quem não é do grupo
--    não recebe nada.
CREATE OR REPLACE FUNCTION public.group_workouts(_group_id uuid)
RETURNS SETOF public.workouts
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT w.*
  FROM public.workouts w
  WHERE w.user_id IN (
    SELECT gm.user_id FROM public.group_members gm WHERE gm.group_id = _group_id
  )
  ORDER BY w.workout_date DESC;
$$;

REVOKE ALL ON FUNCTION public.group_workouts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_workouts(uuid) TO authenticated;
