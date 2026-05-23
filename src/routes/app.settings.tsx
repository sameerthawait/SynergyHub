import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Check,
  CreditCard,
  Loader2,
  Mail,
  Shield,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspace } from "@/hooks/use-workspace";
import { DatabaseSetupRequired } from "@/components/database-setup-required";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const TABS = [
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "members", label: "Members", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "security", label: "Security", icon: Shield },
] as const;

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
  display_name: string | null;
  email?: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
};

function SettingsPage() {
  const { user } = useAuth();
  const { workspace, loading: wsLoading, error: wsError, ensureWorkspace } = useWorkspace();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("workspace");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteRow[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState("Business");

  const isAdmin = role === "ADMIN" || role === "OWNER";

  const load = useCallback(async () => {
    if (!workspace || !user) return;
    setLoading(true);
    setName(workspace.name);
    setSlug(workspace.slug);
    setPlan(workspace.plan);

    const [{ data: membership }, { data: memberRows }, { data: invites, error: inviteError }] =
      await Promise.all([
        supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspace.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("workspace_members")
          .select("user_id,role,created_at")
          .eq("workspace_id", workspace.id)
          .order("created_at"),
        supabase
          .from("workspace_invitations")
          .select("id,email,role,status,created_at,expires_at")
          .eq("workspace_id", workspace.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

    setRole(membership?.role ?? null);
    const userIds = (memberRows ?? []).map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id,display_name").in("id", userIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    setMembers(
      (memberRows ?? []).map((m) => ({
        ...m,
        display_name: profileById.get(m.user_id) ?? null,
      })),
    );
    if (inviteError) {
      toast.error(inviteError.message);
      setPendingInvites([]);
    } else {
      setPendingInvites(invites ?? []);
    }
    setLoading(false);
  }, [workspace, user]);

  useEffect(() => {
    load();
  }, [load]);

  const saveWorkspace = async () => {
    if (!workspace || !isAdmin) return;
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ name: name.trim(), slug: slug.trim(), plan })
      .eq("id", workspace.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    await ensureWorkspace();
    setSaving(false);
    toast.success("Workspace updated");
  };

  const invite = async () => {
    if (!workspace || !user || !isAdmin) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    const { error } = await supabase.from("workspace_invitations").insert({
      workspace_id: workspace.id,
      email,
      role: "MEMBER",
      invited_by: user.id,
    });
    if (error) {
      toast.error(
        error.code === "23505" ? "That email already has a pending invite" : error.message,
      );
      return;
    }
    toast.success(`Invite created for ${email}`);
    setInviteEmail("");
    load();
  };

  const revokeInvite = async (id: string) => {
    const { error } = await supabase.from("workspace_invitations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Invite revoked");
    load();
  };

  const removeMember = async (targetUserId: string) => {
    if (!workspace || !isAdmin) return;

    const confirm = window.confirm("Are you sure you want to remove this member from the workspace?");
    if (!confirm) return;

    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", targetUserId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Member removed");
    load();
  };

  const changeMemberRole = async (targetUserId: string, newRole: string) => {
    if (!workspace || !isAdmin) return;

    const { error } = await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("workspace_id", workspace.id)
      .eq("user_id", targetUserId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Member role updated to ${newRole}`);
    load();
  };

  if (wsLoading || loading) {
    return (
      <div className="h-full grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (wsError) return <DatabaseSetupRequired message={wsError} />;

  return (
    <div className="h-full flex">
      <aside className="w-56 shrink-0 border-r border-border p-4 space-y-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 px-2">
          Settings
        </div>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition",
              tab === t.id
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto p-10 space-y-8">
          {!isAdmin && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              You are a {role?.toLowerCase() ?? "member"}. Admin controls are read-only for your
              role.
            </div>
          )}

          {tab === "workspace" && (
            <>
              <PageTitle title="Workspace" desc="Admin controls for workspace identity." />
              <div className="glass rounded-2xl p-6 space-y-4">
                <Field label="Name">
                  <input
                    value={name}
                    disabled={!isAdmin}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                  />
                </Field>
                <Field label="URL slug" hint="synergyhub.app/[slug]">
                  <input
                    value={slug}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40 font-mono disabled:opacity-60"
                  />
                </Field>
                <button
                  onClick={saveWorkspace}
                  disabled={!isAdmin || saving}
                  className="rounded-lg bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:scale-[1.02] transition disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          )}

          {tab === "members" && (
            <>
              <PageTitle
                title="Members"
                desc={`${members.length} active · ${pendingInvites.length} pending`}
              />
              <div className="glass rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      value={inviteEmail}
                      disabled={!isAdmin}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && invite()}
                      placeholder="teammate@company.com"
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                    />
                  </div>
                  <button
                    onClick={invite}
                    disabled={!isAdmin || !inviteEmail.trim()}
                    className="rounded-lg bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:scale-[1.02] transition disabled:opacity-40"
                  >
                    Invite
                  </button>
                </div>
              </div>
              <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
                {members.map((m) => (
                  <PersonRow
                    key={m.user_id}
                    title={m.display_name ?? m.user_id.slice(0, 8)}
                    subtitle={m.user_id}
                    tag={m.role}
                    roleSelect={
                      isAdmin && m.user_id !== user?.id ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeMemberRole(m.user_id, e.target.value)}
                          className="bg-card border border-border rounded-lg text-xs px-2.5 py-1 text-foreground outline-none focus:ring-1 focus:ring-ring/40 cursor-pointer"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : null
                    }
                    action={
                      isAdmin && m.user_id !== user?.id ? (
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="p-1 rounded text-muted-foreground hover:bg-card hover:text-destructive cursor-pointer"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null
                    }
                  />
                ))}
                {pendingInvites.map((invite) => (
                  <PersonRow
                    key={invite.id}
                    title={invite.email}
                    subtitle={`invited ${new Date(invite.created_at).toLocaleDateString()}`}
                    tag="pending"
                    action={
                      isAdmin ? (
                        <button
                          onClick={() => revokeInvite(invite.id)}
                          className="p-1 rounded text-muted-foreground hover:bg-card hover:text-destructive"
                          title="Revoke invite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null
                    }
                  />
                ))}
              </div>
            </>
          )}

          {tab === "billing" && (
            <>
              <PageTitle title="Billing" desc={`You're on the ${plan} plan.`} />
              <div className="grid sm:grid-cols-2 gap-3">
                {["Free", "Pro", "Business", "Enterprise"].map((p) => (
                  <button
                    key={p}
                    disabled={!isAdmin}
                    onClick={() => setPlan(p)}
                    className={cn(
                      "rounded-2xl p-5 text-left transition disabled:opacity-60",
                      plan === p
                        ? "glass-strong shadow-glow ring-1 ring-[color:var(--neon)]/40"
                        : "glass hover:shadow-glow",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {p}
                      </div>
                      {plan === p && <Check className="h-4 w-4 text-[color:var(--neon)]" />}
                    </div>
                    <div className="text-2xl font-bold mt-2">
                      {p === "Free"
                        ? "$0"
                        : p === "Pro"
                          ? "$8"
                          : p === "Business"
                            ? "$16"
                            : "Custom"}
                      {p !== "Enterprise" && (
                        <span className="text-xs text-muted-foreground font-normal"> / seat</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "ai" && (
            <>
              <PageTitle title="AI" desc="Gemini-powered features and runtime status." />
              <div className="glass rounded-2xl p-6 space-y-4">
                <ToggleRow
                  name="Channel summaries"
                  desc="Summarize long threads on demand"
                  initial
                />
                <ToggleRow
                  name="Smart prioritization"
                  desc="Order cards by impact and due date"
                  initial
                />
                <ToggleRow name="Workspace briefing" desc="Generate daily summaries" initial />
              </div>
            </>
          )}

          {tab === "security" && (
            <>
              <PageTitle title="Security" desc="Authentication and admin access." />
              <div className="glass rounded-2xl p-6 space-y-4">
                <ToggleRow
                  name="Require admin for invites"
                  desc="Enforced by Supabase RLS"
                  initial
                />
                <ToggleRow
                  name="Workspace RLS"
                  desc="Members can only access their workspace"
                  initial
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PageTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function PersonRow({
  title,
  subtitle,
  tag,
  action,
  roleSelect,
}: {
  title: string;
  subtitle: string;
  tag: string;
  action?: React.ReactNode;
  roleSelect?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-bold">
        {title.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      </div>
      {roleSelect ? (
        roleSelect
      ) : (
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-card border border-border text-muted-foreground">
          {tag}
        </span>
      )}
      {action}
    </div>
  );
}

function ToggleRow({ name, desc, initial }: { name: string; desc: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={cn(
          "relative h-6 w-11 rounded-full transition",
          on ? "bg-gradient-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background transition",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
