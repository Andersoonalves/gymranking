
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;

-- Only members of a group can read it
CREATE POLICY "Members can view their groups"
ON public.groups
FOR SELECT
USING (id IN (SELECT public.get_my_group_ids()));

-- Security definer function to look up a group by invite code
-- Callable by anon (signup) and authenticated (join group)
CREATE OR REPLACE FUNCTION public.find_group_by_invite_code(_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name
  FROM public.groups g
  WHERE upper(g.invite_code) = upper(trim(_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_group_by_invite_code(text) TO anon, authenticated;
