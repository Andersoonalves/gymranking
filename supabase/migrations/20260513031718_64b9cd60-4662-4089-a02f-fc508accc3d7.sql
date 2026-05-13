CREATE TABLE IF NOT EXISTS public.body_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weight_kg numeric(5, 2) NOT NULL,
  photo_url text,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON public.body_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.body_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.body_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.body_progress;

CREATE POLICY "Users can view own progress"
  ON public.body_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.body_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.body_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON public.body_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_body_progress_user_recorded_at
  ON public.body_progress (user_id, recorded_at DESC);