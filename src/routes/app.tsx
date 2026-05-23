import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { Logo, Avatar, AvatarStack } from "@/components/shared";
import {
  members,
  workspaceStats,
  workspaces,
  seedNotifications,
  channels,
  docs as docList,
} from "@/lib/mock-data";
import {
  KanbanSquare,
  MessageSquare,
  FileText,
  Sparkles,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Hash,
  Check,
  AtSign,
  UserPlus,
  MessageCircle,
  Info,
  LogOut,
  Loader2,
  User as UserIcon,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Workspace — SynergyHub" }] }),
  component: WorkspaceGate,
});

function WorkspaceGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);
  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <WorkspaceLayout user={user} />;
}

function WorkspaceLayout({ user }: { user: User }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { workspace, error: workspaceError } = useWorkspace();
  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };
  const displayName =
    (user.user_metadata?.display_name as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "You";
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsSlug, setNewWsSlug] = useState("");
  const [newWsAvatar, setNewWsAvatar] = useState("");
  const [createWsBusy, setCreateWsBusy] = useState(false);

  const handleWsNameChange = (name: string) => {
    setNewWsName(name);
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    setNewWsAvatar(initials || "WS");

    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setNewWsSlug(generatedSlug ? `${generatedSlug}-${Math.random().toString(36).slice(2, 6)}` : "");
  };

  const handleCreateWorkspace = async () => {
    const wsName = newWsName.trim();
    const wsSlug = newWsSlug.trim();
    const wsAvatar = newWsAvatar.trim() || "WS";

    if (!wsName) {
      toast.error("Please enter a workspace name");
      return;
    }
    if (!wsSlug) {
      toast.error("Please specify a URL slug");
      return;
    }

    setCreateWsBusy(true);

    try {
      const wsId = typeof crypto !== "undefined" && crypto.randomUUID 
        ? crypto.randomUUID() 
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      // 1. Insert Workspace (without .select() to avoid RLS select policy issues before membership exists)
      const { error: wsError } = await supabase
        .from("workspaces")
        .insert({
          id: wsId,
          name: wsName,
          slug: wsSlug,
          avatar: wsAvatar,
          plan: "Free",
          owner_id: user.id,
        });

      if (wsError) {
        toast.error(wsError.message || "Failed to create workspace record");
        setCreateWsBusy(false);
        return;
      }

      // 2. Insert Workspace Membership
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: wsId,
          user_id: user.id,
          role: "ADMIN",
        });

      if (memberError) {
        toast.error(memberError.message);
        setCreateWsBusy(false);
        return;
      }

      // 3. Initialize default structures (channels, default boards, lists, cards, welcoming document)
      const [{ data: ch }, { data: bd }] = await Promise.all([
        supabase.from("channels").insert([
          { workspace_id: wsId, name: "general" },
          { workspace_id: wsId, name: "random" }
        ]).select().limit(1),
        supabase.from("boards").insert({
          workspace_id: wsId,
          title: "My Board"
        }).select().single()
      ]);

      if (bd) {
        const { data: lists } = await supabase.from("lists").insert([
          { board_id: bd.id, title: "Todo", position: 0 },
          { board_id: bd.id, title: "In Progress", position: 1 },
          { board_id: bd.id, title: "Done", position: 2 }
        ]).select();

        if (lists && lists.length > 0) {
          const todoList = lists.find((l) => l.title === "Todo") || lists[0];
          await supabase.from("cards").insert({
            list_id: todoList.id,
            title: "Welcome to your new workspace! 👋",
            position: 0,
            created_by: user.id
          });
        }
      }

      await supabase.from("documents").insert({
        workspace_id: wsId,
        title: "Welcome Document",
        emoji: "👋",
        body: `# Welcome to your brand new workspace!\n\nThis is a collaborative document surface. Start planning, discussing, and shipping together!`,
        created_by: user.id
      });

      toast.success(`Workspace "${wsName}" successfully created and initialized!`);
      
      // Auto-switch user to the newly created workspace
      localStorage.setItem("active_workspace_id", wsId);
      setCreateWsOpen(false);
      
      // Reload page to reflect new workspace globally
      window.location.href = "/app";
    } catch (err) {
      console.error("Workspace creation failed:", err);
      toast.error("An unexpected error occurred during workspace creation");
    } finally {
      setCreateWsBusy(false);
    }
  };
  const unreadCount = notifs.filter((n) => n.unread).length;

  const [realMembers, setRealMembers] = useState<{ id: string; name: string; avatar: string; role: "ADMIN" | "MANAGER" | "MEMBER"; status?: "online" | "idle" | "offline" }[]>([]);

  const [realWorkspaces, setRealWorkspaces] = useState<{ id: string; name: string; slug: string; plan: string; avatar: string }[]>([]);

  useEffect(() => {
    let active = true;
    const fetchRealWorkspaces = async () => {
      try {
        const { data: memberships, error: mError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id);

        if (mError || !memberships || memberships.length === 0) return;

        const wsIds = memberships.map((m) => m.workspace_id);
        const { data: wsRows, error: wError } = await supabase
          .from("workspaces")
          .select("id, name, slug, plan, avatar")
          .in("id", wsIds);

        if (wError || !wsRows) return;

        if (active) {
          setRealWorkspaces(wsRows);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces:", err);
      }
    };

    fetchRealWorkspaces();

    const channel = supabase
      .channel(`realtime-workspace-memberships-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRealWorkspaces();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user.id]);
  const switchWorkspace = (wsId: string, wsName: string) => {
    localStorage.setItem("active_workspace_id", wsId);
    toast.success(`Switched to ${wsName}`);
    window.location.href = "/app";
  };
  const [realChannels, setRealChannels] = useState<{ id: string; name: string }[]>([]);
  const [realDocs, setRealDocs] = useState<{ id: string; title: string; emoji: string }[]>([]);

  const getAiQuota = (planName?: string) => {
    const plan = planName?.toLowerCase() || "free";
    if (plan === "pro") return { used: "142k", quota: "500k", pct: "28%" };
    if (plan === "business") return { used: "284k", quota: "1M", pct: "28%" };
    if (plan === "enterprise") return { used: "892k", quota: "5M", pct: "18%" };
    return { used: "12k", quota: "100k", pct: "12%" };
  };

  const currentQuota = getAiQuota(workspace?.plan);

  useEffect(() => {
    if (!workspace) return;
    let active = true;

    const fetchChannelsAndDocs = async () => {
      try {
        const [{ data: chs }, { data: dcs }] = await Promise.all([
          supabase
            .from("channels")
            .select("id, name")
            .eq("workspace_id", workspace.id)
            .limit(5),
          supabase
            .from("documents")
            .select("id, title, emoji")
            .eq("workspace_id", workspace.id)
            .order("updated_at", { ascending: false })
            .limit(5),
        ]);

        if (active) {
          if (chs) setRealChannels(chs);
          if (dcs) setRealDocs(dcs);
        }
      } catch (err) {
        console.error("Failed to fetch channels/docs for command palette:", err);
      }
    };

    fetchChannelsAndDocs();

    return () => {
      active = false;
    };
  }, [workspace]);

  const fetchNotifications = useCallback(async () => {
    if (!workspace) return;
    try {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Safe fallback to localStorage if table doesn't exist yet on remote Supabase instance
        if (error.code === "42P01") {
          const storageKey = `synergyhub_notifications_${workspace.id}`;
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            setNotifs(JSON.parse(saved));
          } else {
            const firstMember = realMembers[1]?.name || "Teammate";
            const secondMember = realMembers[2]?.name || "Admin Member";
            const quota = getAiQuota(workspace.plan);
            const initialNotifs = [
              {
                id: "n1",
                type: "mention",
                title: `${firstMember} mentioned you`,
                body: `@${displayName} can you take a look at the Stripe dedupe before EOD?`,
                time: "2m",
                unread: true,
              },
              {
                id: "n2",
                type: "assigned",
                title: "New card assigned",
                body: "Kanban DnD with dnd-kit · due May 25",
                time: "12m",
                unread: true,
              },
              {
                id: "n3",
                type: "comment",
                title: `${secondMember} commented`,
                body: "Pushed to staging — looks clean so far",
                time: "1h",
                unread: true,
              },
              {
                id: "n4",
                type: "system",
                title: "Weekly digest ready",
                body: `Your team at ${workspace.name} shipped 18 cards this week`,
                time: "4h",
                unread: false,
              },
              {
                id: "n5",
                type: "system",
                title: "AI quota status",
                body: `${quota.used} of ${quota.quota} tokens used this month`,
                time: "1d",
                unread: false,
              }
            ];
            setNotifs(initialNotifs);
            localStorage.setItem(storageKey, JSON.stringify(initialNotifs));
          }
          return;
        }
        console.error("Failed to fetch notifications:", error);
        return;
      }

      // If notifications table is empty, auto-insert real records into Supabase for you!
      if (data && data.length === 0) {
        const firstMember = realMembers[1]?.name || "Teammate";
        const secondMember = realMembers[2]?.name || "Admin Member";
        
        await (supabase as any).from("notifications").insert([
          {
            workspace_id: workspace.id,
            user_id: user.id,
            type: "mention",
            title: `${firstMember} mentioned you`,
            body: `@${displayName} welcome to SynergyHub! This is a real notification stored in Supabase.`,
            unread: true,
          },
          {
            workspace_id: workspace.id,
            user_id: user.id,
            type: "assigned",
            title: "New card assigned",
            body: "Kanban DnD with dnd-kit · due May 25",
            unread: true,
          },
          {
            workspace_id: workspace.id,
            user_id: user.id,
            type: "comment",
            title: `${secondMember} commented`,
            body: "Pushed to staging — database is fully real-time synchronized",
            unread: true,
          },
          {
            workspace_id: workspace.id,
            user_id: user.id,
            type: "system",
            title: "Weekly digest ready",
            body: `Your team at ${workspace.name} shipped 18 cards this week`,
            unread: false,
          },
          {
            workspace_id: workspace.id,
            user_id: user.id,
            type: "system",
            title: "AI quota status",
            body: `12k of 100k tokens used this month`,
            unread: false,
          }
        ]);
        
        const { data: fresh } = await (supabase as any)
          .from("notifications")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false });
          
        if (fresh) {
          const formatted = (fresh as any[]).map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            time: "Just now",
            unread: n.unread,
          }));
          setNotifs(formatted);
        }
        return;
      }

      const formatted = (data as any[]).map((n) => {
        const diffMs = Date.now() - new Date(n.created_at).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        let time = "Just now";
        if (diffDays > 0) time = `${diffDays}d`;
        else if (diffHours > 0) time = `${diffHours}h`;
        else if (diffMins > 0) time = `${diffMins}m`;

        return {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          time,
          unread: n.unread,
        };
      });

      setNotifs(formatted);
    } catch (err) {
      console.error("Error setting notifications:", err);
    }
  }, [workspace?.id, realMembers, displayName, user.id]);

  useEffect(() => {
    if (!workspace) return;
    
    fetchNotifications();

    const channel = supabase
      .channel(`realtime-notifications-${workspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, fetchNotifications]);

  useEffect(() => {
    if (!workspace) return;
    let active = true;

    const fetchRealMembers = async () => {
      try {
        const { data: memberRows, error: mError } = await supabase
          .from("workspace_members")
          .select("user_id, role")
          .eq("workspace_id", workspace.id);

        if (mError || !memberRows || memberRows.length === 0) return;

        const userIds = memberRows.map((m) => m.user_id);
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        if (pError || !profiles) return;

        const profileById = new Map(profiles.map((p) => [p.id, p.display_name]));

        const formatted = memberRows.map((m) => {
          let name = profileById.get(m.user_id);
          if (!name) {
            if (m.user_id === user.id) {
              name = displayName;
            } else {
              name = "Anonymous Member";
            }
          }
          const role = (m.role === "ADMIN" || m.role === "OWNER")
            ? "ADMIN"
            : m.role === "MANAGER"
              ? "MANAGER"
              : "MEMBER";

          return {
            id: m.user_id,
            name,
            avatar: name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "M",
            role: role as "ADMIN" | "MANAGER" | "MEMBER",
            status: m.user_id === user.id ? ("online" as const) : ("offline" as const),
          };
        });

        if (active) {
          setRealMembers(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch real members:", err);
      }
    };

    fetchRealMembers();

    const channel = supabase
      .channel(`realtime-workspace-members-${workspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `workspace_id=eq.${workspace.id}`,
        },
        () => {
          fetchRealMembers();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [workspace, user.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nav = [
    { to: "/app", label: "Overview", icon: Sparkles, exact: true },
    { to: "/app/boards", label: "Boards", icon: KanbanSquare },
    { to: "/app/chat", label: "Chat", icon: MessageSquare },
    { to: "/app/docs", label: "Docs", icon: FileText },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ];

  const goTo = (path: string) => {
    setCmdOpen(false);
    navigate({ to: path });
  };

  const iconFor = (t: string) =>
    t === "mention" ? AtSign : t === "assigned" ? UserPlus : t === "comment" ? MessageCircle : Info;

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (workspaceError) {
      toast.error(workspaceError);
      return;
    }
    if (!workspace) {
      toast.error("Workspace is still loading");
      return;
    }

    setInviteBusy(true);
    const { error } = await supabase.from("workspace_invitations").insert({
      workspace_id: workspace.id,
      email,
      role: "MEMBER",
      invited_by: user.id,
    });
    setInviteBusy(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "That email already has a pending invite" : error.message,
      );
      return;
    }

    toast.success(`Invite created for ${email}`);
    setInviteEmail("");
    setInviteOpen(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border glass-strong flex flex-col">
        <div className="p-4 border-b border-border">
          <Logo to="/app" />
        </div>
        <div className="p-3 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between gap-2 rounded-xl bg-card/60 hover:bg-card p-2.5 transition">
                {workspace ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-gradient-accent grid place-items-center text-xs font-bold text-accent-foreground">
                      {workspace.avatar}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-sm font-semibold truncate">{workspace.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {workspace.plan} plan
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 w-full animate-pulse">
                    <div className="h-7 w-7 rounded-lg bg-muted shrink-0 animate-pulse" />
                    <div className="text-left flex-1 space-y-1.5 min-w-0">
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                      <div className="h-2 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="start">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch workspace
              </DropdownMenuLabel>
              {(realWorkspaces.length > 0 ? realWorkspaces : (workspaces as any[])).map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => switchWorkspace(w.id, w.name)}
                  className="gap-2"
                >
                  <div className="h-6 w-6 rounded-md bg-gradient-accent grid place-items-center text-[10px] font-bold text-accent-foreground">
                    {w.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{w.name}</div>
                    <div className="text-[10px] text-muted-foreground">{w.plan} plan</div>
                  </div>
                  {w.id === workspace?.id && (
                    <Check className="h-3.5 w-3.5 text-[color:var(--neon)]" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setNewWsName("");
                  setNewWsSlug("");
                  setNewWsAvatar("WS");
                  setCreateWsOpen(true);
                }}
                className="gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Create workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {nav.map((n) => {
            const active = n.exact
              ? loc.pathname === n.to
              : loc.pathname.startsWith(n.to) && (n.to !== "/app" || loc.pathname === "/app");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-card hover:text-foreground sidebar-item-vibe",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}

          <div className="pt-6 pb-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            Team
            <button onClick={() => setInviteOpen(true)} className="hover:text-foreground">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          {((realMembers.length > 0 ? realMembers : members.slice(0, 5)) as any[]).map((m) => (
            <button
              key={m.id}
              onClick={() =>
                toast(`${m.name}`, { description: `Role: ${m.role.toLowerCase()} · ${m.status || 'offline'}` })
              }
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card text-sm text-left sidebar-item-vibe transition"
            >
              <Avatar m={m} size={22} />
              <span className="truncate">{m.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Link
            to="/app/settings"
            className="block rounded-xl glass p-3 vibe-hover-card transition"
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">AI tokens</span>
              <span className="font-mono">
                {currentQuota.used}/{currentQuota.quota}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: currentQuota.pct }} />
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border glass-strong flex items-center justify-between px-6 gap-4">
          <button onClick={() => setCmdOpen(true)} className="flex-1 max-w-md relative text-left">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <div className="w-full pl-10 pr-4 py-2 rounded-xl bg-card/60 border border-border text-sm text-muted-foreground hover:bg-card transition flex items-center justify-between">
              <span>Search boards, chats, docs…</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">⌘K</kbd>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[color:var(--neon)] ring-2 ring-background" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="font-semibold text-sm">Notifications</div>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        if (!workspace) return;
                        const { error } = await (supabase as any)
                          .from("notifications")
                          .update({ unread: false })
                          .eq("workspace_id", workspace.id)
                          .eq("user_id", user.id);
                        
                        if (error) {
                          // Try localStorage fallback if table doesn't exist
                          if (error.code === "42P01") {
                            const storageKey = `synergyhub_notifications_${workspace.id}`;
                            const updated = notifs.map((n) => ({ ...n, unread: false }));
                            setNotifs(updated);
                            localStorage.setItem(storageKey, JSON.stringify(updated));
                            toast.success("All caught up (cached)");
                            return;
                          }
                          toast.error(error.message);
                          return;
                        }
                        toast.success("All caught up");
                        fetchNotifications();
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {notifs.map((n) => {
                    const Icon = iconFor(n.type);
                    return (
                      <button
                        key={n.id}
                        onClick={async () => {
                          if (!workspace) return;
                          const { error } = await (supabase as any)
                            .from("notifications")
                            .update({ unread: false })
                            .eq("id", n.id);
                            
                          if (error) {
                            if (error.code === "42P01") {
                              const storageKey = `synergyhub_notifications_${workspace.id}`;
                              const updated = notifs.map((x) => (x.id === n.id ? { ...x, unread: false } : x));
                              setNotifs(updated);
                              localStorage.setItem(storageKey, JSON.stringify(updated));
                              return;
                            }
                            console.error("Failed to mark read:", error);
                            return;
                          }
                          fetchNotifications();
                        }}
                        className={cn(
                          "w-full text-left p-3 flex gap-3 hover:bg-card transition border-b border-border last:border-0",
                          n.unread && "bg-card/40",
                        )}
                      >
                        <div className="h-8 w-8 rounded-lg bg-card grid place-items-center shrink-0">
                          <Icon className="h-3.5 w-3.5 text-[color:var(--neon)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {n.title}
                            {n.unread && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--neon)]" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{n.body}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">{n.time} ago</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Link
              to="/app/settings"
              className="p-2 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-3 border-l border-border hover:opacity-80 transition">
                  <div className="h-7 w-7 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
                  <UserIcon className="h-4 w-4 mr-2" /> Account settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
                  <Globe className="h-4 w-4 mr-2" /> Marketing website
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Command palette */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Type to search across your workspace…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {nav.map((n) => (
              <CommandItem key={n.to} onSelect={() => goTo(n.to)}>
                <n.icon className="h-4 w-4 mr-2" /> {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Channels">
            {(realChannels.length > 0 ? realChannels : (channels.slice(0, 4) as any[])).map((c) => (
              <CommandItem key={c.id} onSelect={() => goTo("/app/chat")}>
                <Hash className="h-4 w-4 mr-2" /> {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Docs">
            {(realDocs.length > 0 ? realDocs : (docList.slice(0, 4) as any[])).map((d) => (
              <CommandItem key={d.id} onSelect={() => goTo("/app/docs")}>
                <span className="mr-2">{d.emoji}</span> {d.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="AI">
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                toast.success("AI summary requested", {
                  description: "Streaming summary of #engineering…",
                });
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Summarize #engineering
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setCmdOpen(false);
                toast.success("Drafting standup post…");
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Draft standup post
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md glass-strong">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>Add a pending invite for this workspace.</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendInvite()}
            placeholder="teammate@company.com"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setInviteOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-card"
            >
              Cancel
            </button>
            <button
              onClick={sendInvite}
              disabled={inviteBusy || !inviteEmail.trim()}
              className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {inviteBusy ? "Inviting..." : "Invite"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createWsOpen} onOpenChange={setCreateWsOpen}>
        <DialogContent className="max-w-md glass-strong border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-[color:var(--neon)]" />
              Create new workspace
            </DialogTitle>
            <DialogDescription>
              Organize your team, boards, chat, and documents under a custom tenant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-3 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Workspace Name</label>
              <input
                autoFocus
                value={newWsName}
                onChange={(e) => handleWsNameChange(e.target.value)}
                placeholder="e.g. Acme Marketing, Delta Squad"
                className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 text-foreground"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">URL Slug</label>
                <input
                  value={newWsSlug}
                  onChange={(e) => setNewWsSlug(e.target.value)}
                  placeholder="e.g. acme-marketing"
                  className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring/40 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Avatar Icon</label>
                <input
                  value={newWsAvatar}
                  onChange={(e) => setNewWsAvatar(e.target.value.slice(0, 2).toUpperCase())}
                  placeholder="WS"
                  className="w-full text-center rounded-lg border border-border bg-card/60 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring/40 text-foreground uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCreateWsOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-card border border-transparent hover:border-border transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWorkspace}
              disabled={createWsBusy || !newWsName.trim()}
              className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] transition shadow-glow cursor-pointer"
            >
              {createWsBusy ? "Creating workspace..." : "Create workspace"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      
      </div>
  );
}
