-- Histórico de carga por exercício: alimenta recordes pessoais (PRs) e o
-- gráfico de evolução de carga. Uma linha por "salvar exercício" com carga > 0.

CREATE TABLE public.exercise_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_title text NOT NULL CHECK (char_length(exercise_title) BETWEEN 1 AND 120),
  load_kg numeric(6, 2) NOT NULL CHECK (load_kg >= 0),
  reps smallint NOT NULL DEFAULT 0,
  sets smallint NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX exercise_history_user_title_idx
  ON public.exercise_history (user_id, exercise_title, recorded_at);

ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise history"
  ON public.exercise_history FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own exercise history"
  ON public.exercise_history FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own exercise history"
  ON public.exercise_history FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Opt-out do resumo semanal por assinatura de push
ALTER TABLE public.push_subscriptions
  ADD COLUMN weekly_summary boolean NOT NULL DEFAULT true;
