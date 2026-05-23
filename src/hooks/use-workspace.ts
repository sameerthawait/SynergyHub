import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { ensureWorkspace, type Workspace } from "@/lib/workspace";
export type { Workspace } from "@/lib/workspace";

export function useWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureCurrentWorkspace = useCallback(async () => {
    if (!user) throw new Error("Sign in before creating a workspace");
    const next = await ensureWorkspace(user);
    setWorkspace(next);
    setError(null);
    return next;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const next = await ensureWorkspace(user);
        if (!cancelled) {
          setWorkspace(next);
          setError(null);
          setLoading(false);
        }
        return;
      } catch (e) {
        if (!cancelled) {
          setWorkspace(null);
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    workspace,
    loading: loading || authLoading,
    error,
    ensureWorkspace: ensureCurrentWorkspace,
  };
}
