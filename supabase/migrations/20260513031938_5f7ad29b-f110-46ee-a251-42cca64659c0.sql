CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_my_group_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

REVOKE ALL ON FUNCTION private.get_my_group_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_group_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

ALTER POLICY "Members can view group members"
  ON public.group_members
  USING (group_id IN (SELECT private.get_my_group_ids()));

ALTER POLICY "Members can view their groups"
  ON public.groups
  USING (id IN (SELECT private.get_my_group_ids()));

ALTER POLICY "Users can view profiles in their groups or admin"
  ON public.profiles
  USING (
    user_id = auth.uid()
    OR private.has_role(auth.uid(), 'admin')
    OR user_id IN (
      SELECT gm2.user_id
      FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid()
    )
  );

ALTER POLICY "Users can view programs in their groups"
  ON public.training_programs
  USING (group_id IN (SELECT private.get_my_group_ids()));

ALTER POLICY "Users can insert own programs"
  ON public.training_programs
  WITH CHECK (auth.uid() = user_id AND group_id IN (SELECT private.get_my_group_ids()));

ALTER POLICY "Users can view exercises in their programs"
  ON public.training_exercises
  USING (
    program_id IN (
      SELECT id
      FROM public.training_programs
      WHERE group_id IN (SELECT private.get_my_group_ids())
    )
  );

ALTER POLICY "Admins can view all roles"
  ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'));

ALTER POLICY "Admins can insert roles"
  ON public.user_roles
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

ALTER POLICY "Admins can delete roles"
  ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.get_my_group_ids() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;