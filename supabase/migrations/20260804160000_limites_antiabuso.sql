-- Tetos para impedir que alguém encha o banco de lixo. Cada limite é trigger
-- BEFORE INSERT com RAISE EXCEPTION em português: a mensagem chega ao cliente
-- pelo PostgREST e vira toast direto, sem tabela de tradução de código de erro
-- (que é o que uma policy de RLS daria: 42501 genérico).
--
-- ponytail: contagem em BEFORE INSERT tem janela de corrida — dois inserts
-- concorrentes podem passar do teto por 1. Aceitável para teto antiabuso; se
-- precisar ser exato, o caminho é advisory lock por usuário/grupo.
-- SECURITY DEFINER porque a contagem precisa ver todas as linhas, não só as
-- que a RLS do chamador enxerga.

-- 1. Máximo de 5 grupos criados por pessoa -----------------------------------

CREATE OR REPLACE FUNCTION public.enforce_group_create_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.groups WHERE created_by = NEW.created_by) >= 5 THEN
    RAISE EXCEPTION 'Você já criou 5 grupos, que é o limite. Saia de um ou apague antes de criar outro.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_group_create_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS groups_create_limit ON public.groups;
CREATE TRIGGER groups_create_limit
  BEFORE INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_create_limit();

-- 2. Máximo de 20 membros por grupo ------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_group_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.group_members WHERE group_id = NEW.group_id) >= 20 THEN
    RAISE EXCEPTION 'Este grupo já está cheio: são 20 membros no máximo.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_group_member_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS group_members_size_limit ON public.group_members;
CREATE TRIGGER group_members_size_limit
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_group_member_limit();

-- 3. Máximo de 10 desafios em paralelo por criador ---------------------------
-- "Em paralelo" = ainda não encerrado (ends_at >= hoje). Conta por criador e
-- não por grupo, senão bastaria criar grupos para multiplicar o teto.

CREATE OR REPLACE FUNCTION public.enforce_challenge_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.challenges
    WHERE created_by = NEW.created_by AND ends_at >= current_date
  ) >= 10 THEN
    RAISE EXCEPTION 'Você já tem 10 desafios em andamento, que é o limite. Espere um encerrar ou apague um.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_challenge_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS challenges_parallel_limit ON public.challenges;
CREATE TRIGGER challenges_parallel_limit
  BEFORE INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_challenge_limit();

-- 4. Máximo de 10 treinos por dia por pessoa ---------------------------------
-- O dia é o de São Paulo, igual ao que o app mostra no calendário e no streak.

CREATE OR REPLACE FUNCTION public.enforce_daily_workout_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.workouts
    WHERE user_id = NEW.user_id
      AND (workout_date AT TIME ZONE 'America/Sao_Paulo')::date
        = (NEW.workout_date AT TIME ZONE 'America/Sao_Paulo')::date
  ) >= 10 THEN
    RAISE EXCEPTION 'Limite de 10 treinos registrados no mesmo dia.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_daily_workout_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS workouts_daily_limit ON public.workouts;
CREATE TRIGGER workouts_daily_limit
  BEFORE INSERT ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_workout_limit();

-- 5. Máximo de 30 exercícios por ficha ---------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_program_exercise_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.training_exercises WHERE program_id = NEW.program_id) >= 30 THEN
    RAISE EXCEPTION 'Esta ficha já tem 30 exercícios, que é o limite.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_program_exercise_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS training_exercises_per_program_limit ON public.training_exercises;
CREATE TRIGGER training_exercises_per_program_limit
  BEFORE INSERT ON public.training_exercises
  FOR EACH ROW EXECUTE FUNCTION public.enforce_program_exercise_limit();

-- 6. Texto livre com teto ----------------------------------------------------
-- O campo que a pessoa digita é limitado a 50 caracteres na tela. Aqui a trava
-- é 500 porque o treino ao vivo grava a lista de exercícios em `notes`
-- automaticamente, o que passa de 50 com facilidade.

ALTER TABLE public.workouts
  ADD CONSTRAINT workouts_notes_length CHECK (char_length(notes) <= 500);

ALTER TABLE public.body_progress
  ADD CONSTRAINT body_progress_notes_length CHECK (char_length(notes) <= 500);

-- 7. Buckets de imagem: 1 MB e só imagem -------------------------------------
-- Vale para upload direto do cliente (foto de treino e de progresso). O avatar
-- passa pelo Worker, que já corta em 1 MB.

UPDATE storage.buckets
SET file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/avif', 'image/webp', 'image/jpeg', 'image/png']
WHERE id IN ('avatars', 'workout-photos', 'progress-photos');
