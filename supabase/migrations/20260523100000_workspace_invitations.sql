CREATE TABLE public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER',
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_workspace_invitations_pending_email
  ON public.workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace invitations"
  ON public.workspace_invitations FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can create workspace invitations"
  ON public.workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Members can update workspace invitations"
  ON public.workspace_invitations FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can delete workspace invitations"
  ON public.workspace_invitations FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

ALTER TABLE public.workspace_invitations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_invitations;

