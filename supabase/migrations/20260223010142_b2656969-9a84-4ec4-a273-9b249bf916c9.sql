
-- Training programs (treinos montados pelo usuário)
CREATE TABLE public.training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view programs in their groups"
  ON public.training_programs FOR SELECT
  USING (group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Users can insert own programs"
  ON public.training_programs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND group_id IN (SELECT get_my_group_ids()));

CREATE POLICY "Users can update own programs"
  ON public.training_programs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own programs"
  ON public.training_programs FOR DELETE
  USING (auth.uid() = user_id);

-- Exercises within a training program
CREATE TABLE public.training_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  load_kg NUMERIC DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 12,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exercises in their programs"
  ON public.training_exercises FOR SELECT
  USING (program_id IN (SELECT id FROM public.training_programs WHERE group_id IN (SELECT get_my_group_ids())));

CREATE POLICY "Users can insert exercises in own programs"
  ON public.training_exercises FOR INSERT
  WITH CHECK (program_id IN (SELECT id FROM public.training_programs WHERE user_id = auth.uid()));

CREATE POLICY "Users can update exercises in own programs"
  ON public.training_exercises FOR UPDATE
  USING (program_id IN (SELECT id FROM public.training_programs WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete exercises in own programs"
  ON public.training_exercises FOR DELETE
  USING (program_id IN (SELECT id FROM public.training_programs WHERE user_id = auth.uid()));
