-- Dieta: plano de refeições com histórico + check diário de aderência.
--
-- Histórico sem tabela de versões: cada linha de diet_meals vale por um
-- intervalo de datas (effective_from .. archived_at). Editar não faz UPDATE no
-- texto — arquiva a linha vigente e insere outra a partir de hoje. Assim a
-- aderência de três meses atrás continua apontando para o que estava escrito
-- naquele dia. Excluir é arquivar; nada de DELETE, senão o passado muda.

CREATE TABLE public.diet_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  time_of_day TIME,
  description TEXT CHECK (char_length(description) <= 2000),
  -- 0 = domingo .. 6 = sábado (igual Date.getDay()). NULL = todo dia.
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  position INTEGER NOT NULL DEFAULT 0,
  -- Macros são opcionais e digitados à mão: a aderência não depende deles.
  kcal NUMERIC(6,1) CHECK (kcal >= 0),
  protein_g NUMERIC(6,1) CHECK (protein_g >= 0),
  carbs_g NUMERIC(6,1) CHECK (carbs_g >= 0),
  fat_g NUMERIC(6,1) CHECK (fat_g >= 0),
  effective_from DATE NOT NULL DEFAULT current_date,
  archived_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- archived_at = effective_from significa "nunca valeu em dia nenhum": é o que
  -- acontece ao apagar no mesmo dia em que criou.
  CONSTRAINT diet_meals_periodo_valido CHECK (archived_at IS NULL OR archived_at >= effective_from)
);

-- A tela do dia filtra por dono e janela de vigência.
CREATE INDEX diet_meals_user_idx ON public.diet_meals (user_id, effective_from, archived_at);

CREATE TABLE public.diet_meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Presença da linha = refeição cumprida. Desmarcar é DELETE.
  UNIQUE (user_id, meal_id, log_date)
);

CREATE INDEX diet_meal_logs_user_date_idx ON public.diet_meal_logs (user_id, log_date);

-- Compartilhar dieta com o grupo é opt-in, default desligado.
ALTER TABLE public.profiles
  ADD COLUMN diet_shared BOOLEAN NOT NULL DEFAULT false;

-- Quem pode ver a dieta de _owner: o próprio, ou quem divide grupo com ele
-- quando ele ligou diet_shared. SECURITY DEFINER porque a checagem lê profiles e
-- group_members de outra pessoa — dentro de uma policy, subquery normal passaria
-- pela RLS dessas tabelas e daria falso negativo (ou recursão, no caso de
-- group_members).
CREATE OR REPLACE FUNCTION public.can_view_diet(_owner UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.group_members gm ON gm.user_id = p.user_id
      WHERE p.user_id = _owner
        AND p.diet_shared
        AND gm.group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_diet(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_diet(UUID) TO authenticated;

ALTER TABLE public.diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_meal_logs ENABLE ROW LEVEL SECURITY;

-- Escrita é sempre só do dono; a leitura é que abre para o grupo no opt-in.
CREATE POLICY "Users can manage own diet meals"
  ON public.diet_meals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group peers can view shared diet meals"
  ON public.diet_meals
  FOR SELECT
  USING (public.can_view_diet(user_id));

CREATE POLICY "Users can manage own diet logs"
  ON public.diet_meal_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group peers can view shared diet logs"
  ON public.diet_meal_logs
  FOR SELECT
  USING (public.can_view_diet(user_id));

-- Tetos antiabuso no mesmo padrão de 20260804160000_limites_antiabuso.sql:
-- trigger BEFORE INSERT com mensagem em português que o cliente mostra direto.
--
-- ponytail: contagem em BEFORE INSERT tem janela de corrida — dois inserts
-- concorrentes podem passar do teto por 1. Aceitável para teto antiabuso.

CREATE OR REPLACE FUNCTION public.enforce_diet_meal_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.diet_meals
    WHERE user_id = NEW.user_id AND archived_at IS NULL
  ) >= 40 THEN
    RAISE EXCEPTION 'Sua dieta já tem 40 refeições ativas, que é o limite. Apague uma antes de criar outra.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_diet_meal_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER diet_meals_limit
  BEFORE INSERT ON public.diet_meals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_diet_meal_limit();

CREATE OR REPLACE FUNCTION public.enforce_diet_log_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.diet_meal_logs
    WHERE user_id = NEW.user_id AND log_date = NEW.log_date
  ) >= 40 THEN
    RAISE EXCEPTION 'Limite de 40 refeições marcadas por dia atingido.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_diet_log_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER diet_meal_logs_limit
  BEFORE INSERT ON public.diet_meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_diet_log_limit();
