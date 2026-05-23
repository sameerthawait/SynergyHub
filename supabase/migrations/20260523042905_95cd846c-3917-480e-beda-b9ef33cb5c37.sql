-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'Free',
  avatar text NOT NULL DEFAULT 'WS',
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'MEMBER',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_workspace_member(_ws uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _user);
$$;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid,uuid) TO authenticated;

-- Boards / lists / cards
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  due_at timestamptz,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lists_board ON public.lists(board_id, position);
CREATE INDEX idx_cards_list ON public.cards(list_id, position);

-- Channels / messages
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_channel ON public.messages(channel_id, created_at);

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  emoji text NOT NULL DEFAULT '📄',
  body text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (public.is_workspace_member(id, auth.uid()));
CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update workspace" ON public.workspaces
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete workspace" ON public.workspaces
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Members can view their memberships" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "Owners or self can insert membership" ON public.workspace_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );
CREATE POLICY "Self or owner can delete membership" ON public.workspace_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "Members access boards" ON public.boards
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members access lists" ON public.lists
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = lists.board_id AND public.is_workspace_member(b.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = lists.board_id AND public.is_workspace_member(b.workspace_id, auth.uid())));

CREATE POLICY "Members access cards" ON public.cards
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lists l JOIN public.boards b ON b.id = l.board_id WHERE l.id = cards.list_id AND public.is_workspace_member(b.workspace_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists l JOIN public.boards b ON b.id = l.board_id WHERE l.id = cards.list_id AND public.is_workspace_member(b.workspace_id, auth.uid())));

CREATE POLICY "Members access channels" ON public.channels
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.channels c WHERE c.id = messages.channel_id AND public.is_workspace_member(c.workspace_id, auth.uid())));
CREATE POLICY "Members send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.channels c WHERE c.id = messages.channel_id AND public.is_workspace_member(c.workspace_id, auth.uid()))
  );
CREATE POLICY "Authors update own messages" ON public.messages
  FOR UPDATE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Authors delete own messages" ON public.messages
  FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Members access documents" ON public.documents
  FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

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

  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.provision_user_workspace() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.provision_user_workspace();

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.cards REPLICA IDENTITY FULL;
ALTER TABLE public.lists REPLICA IDENTITY FULL;
ALTER TABLE public.boards REPLICA IDENTITY FULL;
ALTER TABLE public.channels REPLICA IDENTITY FULL;
ALTER TABLE public.documents REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;