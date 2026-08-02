-- Desafios: competições com prazo dentro do grupo.
-- O placar deriva de workouts (participante + período), não há tabela de score.

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  emoji text NOT NULL DEFAULT '🔥',
  -- meta individual opcional: primeiro a bater vence; sem meta, vence quem somar mais até o fim
  target smallint CHECK (target BETWEEN 1 AND 999),
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at >= starts_at)
);

CREATE INDEX challenges_group_id_idx ON public.challenges (group_id);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group challenges"
  ON public.challenges
  FOR SELECT
  USING (group_id IN (SELECT private.get_my_group_ids()));

CREATE POLICY "Members can create challenges in their groups"
  ON public.challenges
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND group_id IN (SELECT private.get_my_group_ids())
  );

CREATE POLICY "Creators can delete own challenges"
  ON public.challenges
  FOR DELETE
  USING (created_by = (SELECT auth.uid()));

CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX challenge_participants_user_id_idx ON public.challenge_participants (user_id);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view challenge participants"
  ON public.challenge_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.group_id IN (SELECT private.get_my_group_ids())
    )
  );

CREATE POLICY "Members can join challenges in their groups"
  ON public.challenge_participants
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_id
        AND c.group_id IN (SELECT private.get_my_group_ids())
    )
  );

CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));
