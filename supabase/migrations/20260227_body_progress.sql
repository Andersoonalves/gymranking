-- Create body_progress table for tracking user weight and progress photos
CREATE TABLE public.body_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 2) NOT NULL,
  photo_url TEXT NULL,
  notes TEXT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_progress ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/insert/delete their own records
CREATE POLICY "Users can view own progress"
  ON public.body_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.body_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON public.body_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.body_progress FOR UPDATE
  USING (auth.uid() = user_id);
