-- Usuário precisa ver as próprias linhas em group_members para listar "meus grupos".
-- A política "Members can view group members" exige que group_id esteja em (SELECT group_id ... WHERE user_id = auth.uid()),
-- o que cria dependência circular: a linha recém-inserida pode não ser visível na mesma consulta.
-- Esta política permite que o usuário veja sempre as linhas onde user_id = auth.uid().

CREATE POLICY "Users can view own memberships"
  ON public.group_members
  FOR SELECT
  USING (user_id = auth.uid());
