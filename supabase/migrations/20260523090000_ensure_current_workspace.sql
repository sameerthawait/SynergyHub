CREATE OR REPLACE FUNCTION public.ensure_current_workspace()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  plan text,
  avatar text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  ws_id uuid;
  board_id uuid;
  display text;
  base_slug text;
  final_slug text;
  suffix int := 0;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT w.id
  INTO ws_id
  FROM public.workspaces w
  WHERE w.owner_id = current_user_id
  ORDER BY w.created_at
  LIMIT 1;

  IF ws_id IS NULL THEN
    SELECT COALESCE(
      p.display_name,
      split_part(u.email, '@', 1),
      'My'
    )
    INTO display
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = current_user_id;

    base_slug := 'ws-' || substr(current_user_id::text, 1, 8);
    final_slug := base_slug;

    WHILE EXISTS (SELECT 1 FROM public.workspaces w WHERE w.slug = final_slug) LOOP
      suffix := suffix + 1;
      final_slug := base_slug || '-' || suffix::text;
    END LOOP;

    INSERT INTO public.workspaces (name, slug, plan, avatar, owner_id)
    VALUES (
      display || '''s Workspace',
      final_slug,
      'Free',
      upper(substr(display, 1, 2)),
      current_user_id
    )
    RETURNING workspaces.id INTO ws_id;
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, current_user_id, 'ADMIN')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  INSERT INTO public.channels (workspace_id, name)
  SELECT ws_id, name
  FROM (VALUES ('general'), ('random')) AS defaults(name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.channels c
    WHERE c.workspace_id = ws_id AND c.name = defaults.name
  );

  SELECT b.id
  INTO board_id
  FROM public.boards b
  WHERE b.workspace_id = ws_id
  ORDER BY b.created_at
  LIMIT 1;

  IF board_id IS NULL THEN
    INSERT INTO public.boards (workspace_id, title)
    VALUES (ws_id, 'My Board')
    RETURNING boards.id INTO board_id;

    INSERT INTO public.lists (board_id, title, position)
    VALUES
      (board_id, 'Todo', 0),
      (board_id, 'In Progress', 1),
      (board_id, 'Done', 2);
  END IF;

  RETURN QUERY
  SELECT w.id, w.name, w.slug, w.plan, w.avatar
  FROM public.workspaces w
  WHERE w.id = ws_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_current_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_workspace() TO authenticated;

