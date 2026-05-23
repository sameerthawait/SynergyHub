import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Workspace = { id: string; name: string; slug: string; plan: string; avatar: string };

const MISSING_SCHEMA_MESSAGE =
  "Database tables are missing. Apply the Supabase migrations before using the workspace.";

export function isMissingSchemaError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");

  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("ensure_current_workspace")
  );
}

function normalizeSupabaseError(error: unknown) {
  if (isMissingSchemaError(error)) return new Error(MISSING_SCHEMA_MESSAGE);
  if (error instanceof Error) return error;
  if (typeof error === "object" && error && "message" in error) {
    return new Error(String((error as { message?: unknown }).message ?? "Supabase request failed"));
  }
  return new Error(String(error ?? "Supabase request failed"));
}

function workspaceNameFor(user: User) {
  const display =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "My";

  return {
    name: `${display}'s Workspace`,
    avatar: display.slice(0, 2).toUpperCase(),
    slug: `ws-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
  };
}

export async function ensureWorkspace(user: User): Promise<Workspace> {
  // 1. Check if there is an active workspace set in localStorage
  if (typeof window !== "undefined") {
    const activeId = localStorage.getItem("active_workspace_id");
    if (activeId) {
      const { data: existing } = await supabase
        .from("workspaces")
        .select("id,name,slug,plan,avatar")
        .eq("id", activeId)
        .maybeSingle();

      if (existing) {
        // Verify they are a member of this workspace
        const { data: member } = await supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", activeId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (member) {
          return existing;
        }
      }
    }
  }

  // 2. Otherwise run repair/provision check
  const repaired = await supabase.rpc("ensure_current_workspace");

  if (repaired.data?.[0]) {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_workspace_id", repaired.data[0].id);
    }
    return repaired.data[0];
  }
  if (repaired.error && isMissingSchemaError(repaired.error))
    throw normalizeSupabaseError(repaired.error);

  const existing = await supabase
    .from("workspaces")
    .select("id,name,slug,plan,avatar")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw normalizeSupabaseError(existing.error);
  }
  if (existing.data) {
    if (typeof window !== "undefined") {
      localStorage.setItem("active_workspace_id", existing.data.id);
    }
    return existing.data;
  }

  const id = crypto.randomUUID();
  const fallback = workspaceNameFor(user);
  const workspaceToCreate = {
    id,
    ...fallback,
    plan: "Free",
    owner_id: user.id,
  };

  const workspaceInsert = await supabase.from("workspaces").insert(workspaceToCreate);
  if (workspaceInsert.error) {
    const rpcMessage = repaired.error ? ` RPC: ${repaired.error.message}` : "";
    throw normalizeSupabaseError(new Error(`${workspaceInsert.error.message}${rpcMessage}`));
  }

  const memberInsert = await supabase
    .from("workspace_members")
    .insert({ workspace_id: id, user_id: user.id, role: "ADMIN" });

  if (memberInsert.error) throw normalizeSupabaseError(memberInsert.error);

  if (typeof window !== "undefined") {
    localStorage.setItem("active_workspace_id", id);
  }

  return {
    id,
    name: workspaceToCreate.name,
    slug: workspaceToCreate.slug,
    plan: workspaceToCreate.plan,
    avatar: workspaceToCreate.avatar,
  };
}
