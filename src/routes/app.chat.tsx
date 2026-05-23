import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Hash, Lock, Plus, Send, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DatabaseSetupRequired } from "@/components/database-setup-required";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { summarize } from "@/lib/ai.functions";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

type Channel = { id: string; name: string; is_private: boolean };
type Message = {
  id: string;
  channel_id: string;
  author_id: string;
  body: string;
  created_at: string;
};
type Profile = { id: string; display_name: string | null };

function ChatPage() {
  const { workspace, loading: wsLoading, error: wsError, ensureWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const [input, setInput] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runSummarize = useServerFn(summarize);

  const loadProfile = useCallback(async (uid: string) => {
    if (profilesRef.current[uid]) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name")
      .eq("id", uid)
      .maybeSingle();
    if (data) setProfiles((p) => ({ ...p, [uid]: data }));
  }, []);

  // Load channels
  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("id,name,is_private")
        .eq("workspace_id", workspace.id)
        .order("created_at");
      if (error) {
        toast.error(error.message);
        return;
      }
      setChannels(data ?? []);
      if (data && data.length && !activeId) setActiveId(data[0].id);
    })();
  }, [workspace, activeId]);

  // Load messages + realtime
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", activeId)
        .order("created_at")
        .limit(100);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setMessages(data ?? []);
      (data ?? []).forEach((m) => loadProfile(m.author_id));
    })();
    const ch = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          loadProfile(m.author_id);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [activeId, loadProfile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!input.trim() || !user || !activeId) return;
    const body = input.trim();
    setInput("");
    const { error } = await supabase
      .from("messages")
      .insert({ channel_id: activeId, author_id: user.id, body });
    if (error) toast.error(error.message);
  };

  const createChannel = async () => {
    const name = newName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    if (!name) {
      toast.error("Enter a channel name");
      return;
    }
    if (!user) {
      toast.error("Sign in before creating a channel");
      return;
    }
    setCreatingChannel(true);
    try {
      const targetWorkspace = workspace ?? (await ensureWorkspace());
      const { data, error } = await supabase
        .from("channels")
        .insert({ workspace_id: targetWorkspace.id, name })
        .select()
        .single();
      if (error) throw error;
      setChannels((c) => [...c, data]);
      setActiveId(data.id);
      setNewName("");
      setNewOpen(false);
      toast.success(`#${name} created`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreatingChannel(false);
    }
  };

  const runAi = async () => {
    if (!activeId) return;
    setAiOpen(true);
    setAiLoading(true);
    setAiText("");
    try {
      const r = await runSummarize({ data: { channelId: activeId } });
      setAiText(r.summary);
    } catch (e) {
      setAiText((e as Error).message);
    }
    setAiLoading(false);
  };

  if (wsLoading)
    return (
      <div className="h-full grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (wsError) return <DatabaseSetupRequired message={wsError} />;
  const active = channels.find((c) => c.id === activeId);

  return (
    <div className="h-full flex">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Channels</h2>
          <button
            onClick={() => setNewOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-0.5">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition",
                c.id === activeId
                  ? "bg-gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              {c.is_private ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
              <span className="flex-1 text-left truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between glass-strong">
          <div className="flex items-center gap-2">
            {active?.is_private ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            <h2 className="font-semibold">{active?.name ?? "—"}</h2>
          </div>
          <button
            onClick={runAi}
            disabled={!activeId}
            className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-accent text-accent-foreground font-medium hover:scale-[1.02] transition disabled:opacity-40"
          >
            <Sparkles className="h-3 w-3" /> Summarize
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              No messages yet. Say hi 👋
            </div>
          )}
          {messages.map((m) => {
            const name = profiles[m.author_id]?.display_name ?? "Someone";
            return (
              <div key={m.id} className="flex gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-xs font-bold shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mt-0.5 whitespace-pre-wrap">
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="glass rounded-2xl p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-ring/40 transition">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={active ? `Message #${active.name}` : "Select a channel"}
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none text-sm py-2 max-h-32 px-2"
            />
            <button
              onClick={send}
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-gradient-primary text-primary-foreground disabled:opacity-40 transition hover:scale-105"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--neon)]" /> Summary of #{active?.name}
            </DialogTitle>
            <DialogDescription>Generated by Gemini</DialogDescription>
          </DialogHeader>
          {aiLoading ? (
            <div className="py-8 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-sm">
              <ReactMarkdown>{aiText}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md glass-strong">
          <DialogHeader>
            <DialogTitle>Create channel</DialogTitle>
            <DialogDescription>
              Channels are where your team has focused conversations.
            </DialogDescription>
          </DialogHeader>
          {wsError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {wsError}
            </div>
          )}
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createChannel()}
              placeholder="e.g. product-launch"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setNewOpen(false)}
              className="text-sm px-4 py-2 rounded-lg hover:bg-card text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={createChannel}
              disabled={!newName.trim() || creatingChannel}
              className="text-sm px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium disabled:opacity-40"
            >
              {creatingChannel ? "Creating..." : "Create"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
