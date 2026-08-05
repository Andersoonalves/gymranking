-- Criar grupo estava falhando: quem cria ainda não é membro, então a policy de
-- SELECT escondia a própria linha. Isso quebrava o RETURNING do insert (42501) e
-- também o EXISTS da policy de INSERT de group_members (que lê groups sob RLS).
-- Deixar o criador ver o grupo dele resolve os dois.
ALTER POLICY "Members can view their groups"
  ON public.groups
  USING (
    id IN (SELECT private.get_my_group_ids())
    OR created_by = (SELECT auth.uid())
  );
