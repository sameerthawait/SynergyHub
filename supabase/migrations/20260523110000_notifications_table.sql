-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Enable Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Auto-provision initial welcome notifications inside provision_user_workspace
CREATE OR REPLACE FUNCTION public.provision_user_notifications(ws_id uuid, usr_id uuid, display text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (workspace_id, user_id, type, title, body, unread)
  VALUES 
    (ws_id, usr_id, 'mention', 'Welcome Teammate mentioned you', '@' || display || ' welcome to SynergyHub! This is a real notification stored in Supabase.', true),
    (ws_id, usr_id, 'assigned', 'New card assigned', 'Kanban DnD with dnd-kit · due May 25', true),
    (ws_id, usr_id, 'comment', 'Admin Member commented', 'Pushed to staging — database is fully real-time synchronized', true),
    (ws_id, usr_id, 'system', 'AI quota status', '12k of 100k tokens used this month', false);
END; $$;

-- Adjust the provision_user_workspace trigger function to also provision notifications
CREATE OR REPLACE FUNCTION public.provision_user_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ws_id uuid;
  board_id uuid;
  list_todo uuid;
  display text;
BEGIN
  display := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'My'
  );

  INSERT INTO public.workspaces (name, slug, plan, avatar, owner_id)
  VALUES (
    display || '''s Workspace',
    'ws-' || substr(NEW.id::text, 1, 8),
    'Free',
    upper(substr(display, 1, 2)),
    NEW.id
  ) RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'ADMIN');

  INSERT INTO public.channels (workspace_id, name) VALUES (ws_id, 'general'), (ws_id, 'random');

  INSERT INTO public.boards (workspace_id, title)
  VALUES (ws_id, 'My Board') RETURNING id INTO board_id;

  INSERT INTO public.lists (board_id, title, position) VALUES (board_id, 'Todo', 0) RETURNING id INTO list_todo;
  INSERT INTO public.lists (board_id, title, position) VALUES (board_id, 'In Progress', 1), (board_id, 'Done', 2);

  INSERT INTO public.cards (list_id, title, position, created_by)
  VALUES (list_todo, 'Welcome to SynergyHub 👋', 0, NEW.id);

  INSERT INTO public.documents (workspace_id, title, emoji, body, created_by)
  VALUES (ws_id, 'Welcome', '👋', E'# Welcome to SynergyHub\n\nStart writing here.', NEW.id);

  -- Provision initial notifications!
  PERFORM public.provision_user_notifications(ws_id, NEW.id, display);

  RETURN NEW;
END; $$;
