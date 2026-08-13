-- Silenciar notificação de treino por grupo ou por membro do grupo.
-- Modelo é mute (não subscribe): sem linha = recebe, igual ao comportamento
-- atual. Assim ninguém precisa reativar nada depois do deploy.
CREATE TABLE public.notification_mutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  -- NULL = grupo inteiro silenciado; preenchido = só esse membro.
  muted_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NULLS NOT DISTINCT para o mute do grupo inteiro (muted_user_id NULL) não
-- duplicar.
CREATE UNIQUE INDEX notification_mutes_uniq
  ON public.notification_mutes (user_id, group_id, muted_user_id) NULLS NOT DISTINCT;

-- A Edge Function busca por grupo, não por dono do mute.
CREATE INDEX notification_mutes_group_idx ON public.notification_mutes (group_id);

ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification mutes"
  ON public.notification_mutes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
