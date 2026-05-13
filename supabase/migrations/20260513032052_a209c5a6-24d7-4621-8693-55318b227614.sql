CREATE OR REPLACE FUNCTION public.join_group_by_invite_code(_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.groups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_group
  FROM public.groups
  WHERE upper(invite_code) = upper(trim(_code))
  LIMIT 1;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group.id, auth.uid(), 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_group.id, v_group.name;
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_by_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_by_invite_code(text) TO authenticated;

DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Creators can add themselves as group admins"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'admin'
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = group_id
        AND g.created_by = auth.uid()
    )
  );