CREATE OR REPLACE FUNCTION public.is_workspace_admin(_ws uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = _ws
      AND user_id = _user
      AND role IN ('ADMIN', 'OWNER')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Members can create workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Members can update workspace invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Members can delete workspace invitations" ON public.workspace_invitations;

CREATE POLICY "Admins can create workspace invitations"
  ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "Admins can update workspace invitations"
  ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can delete workspace invitations"
  ON public.workspace_invitations FOR DELETE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

