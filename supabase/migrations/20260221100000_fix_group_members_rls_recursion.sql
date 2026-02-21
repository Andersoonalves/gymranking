-- Corrige recursão infinita na RLS de group_members.
-- A política "Members can view group members" usava um subquery em group_members,
-- o que fazia o Postgres reavaliar RLS ao ler a própria tabela (42P17).
-- Solução: função SECURITY DEFINER que retorna os group_ids do usuário sem passar por RLS.

CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid();
$$;

-- Remove as duas políticas de SELECT atuais para recriar uma só sem recursão
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.group_members;

-- Uma única política: usuário vê linhas de group_members cujo group_id está entre "seus" grupos.
-- get_my_group_ids() bypassa RLS (SECURITY DEFINER), então não há recursão.
CREATE POLICY "Members can view group members"
  ON public.group_members
  FOR SELECT
  USING (group_id IN (SELECT public.get_my_group_ids()));
