import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  KanbanSquare,
  MessageSquare,
  FileText,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useServerFn } from "@tanstack/react-start";
import { briefing } from "@/lib/ai.functions";
import ReactMarkdown from "react-markdown";
import { DatabaseSetupRequired } from "@/components/database-setup-required";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

function Overview() {
  const { workspace, error: wsError } = useWorkspace();
  const [stats, setStats] = useState({ cards: 0, messages: 0, docs: 0, channels: 0 });
  const [brief, setBrief] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const runBriefing = useServerFn(briefing);

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const [c, m, d, ch] = await Promise.all([
        supabase
          .from("cards")
          .select("id, lists!inner(boards!inner(workspace_id))", { count: "exact", head: true })
          .eq("lists.boards.workspace_id", workspace.id),
        supabase
          .from("messages")
          .select("id, channels!inner(workspace_id)", { count: "exact", head: true })
          .eq("channels.workspace_id", workspace.id),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id),
        supabase
          .from("channels")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id),
      ]);
      setStats({
        cards: c.count ?? 0,
        messages: m.count ?? 0,
        docs: d.count ?? 0,
        channels: ch.count ?? 0,
      });
    })();
  }, [workspace]);

  const generate = async () => {
    if (!workspace) return;
    setBriefLoading(true);
    try {
      const r = await runBriefing({ data: { workspaceId: workspace.id } });
      setBrief(r.briefing);
    } catch (e) {
      setBrief((e as Error).message);
    }
    setBriefLoading(false);
  };

  const cards = [
    { label: "Cards", value: stats.cards, icon: KanbanSquare, to: "/app/boards" },
    { label: "Messages", value: stats.messages, icon: MessageSquare, to: "/app/chat" },
    { label: "Docs", value: stats.docs, icon: FileText, to: "/app/docs" },
    { label: "Channels", value: stats.channels, icon: MessageSquare, to: "/app/chat" },
  ];

  if (wsError) return <DatabaseSetupRequired message={wsError} />;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{workspace?.name ?? "Workspace"}</div>
          <h1 className="text-3xl font-bold">Here's what's moving today.</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="glass rounded-2xl p-5 vibe-hover-card transition"
            >
              <s.icon className="h-5 w-5 mb-3 text-[color:var(--neon)]" />
              <div className="text-2xl font-bold font-display">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Link>
          ))}
        </div>

        <div className="glass-strong rounded-3xl p-6 relative overflow-hidden shadow-glow">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
          <div className="flex items-start gap-4 relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-[color:var(--neon)] font-semibold mb-2">
                AI Briefing · Powered by Gemini
              </div>
              {brief ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{brief}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Click below to generate today's briefing based on your workspace activity.
                </p>
              )}
              <button
                onClick={generate}
                disabled={briefLoading}
                className="mt-4 inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full bg-gradient-primary text-primary-foreground font-medium hover:scale-[1.02] transition disabled:opacity-50"
              >
                {briefLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Generate briefing
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Link
            to="/app/boards"
            className="glass rounded-2xl p-6 vibe-hover-card transition group"
          >
            <KanbanSquare className="h-5 w-5 mb-3 text-[color:var(--neon)]" />
            <div className="font-semibold mb-1">Boards</div>
            <p className="text-xs text-muted-foreground">
              Plan work, move cards, prioritize with AI.
            </p>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition mt-3" />
          </Link>
          <Link to="/app/chat" className="glass rounded-2xl p-6 vibe-hover-card transition group">
            <MessageSquare className="h-5 w-5 mb-3 text-[color:var(--neon)]" />
            <div className="font-semibold mb-1">Chat</div>
            <p className="text-xs text-muted-foreground">Realtime channels with AI summaries.</p>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition mt-3" />
          </Link>
          <Link to="/app/docs" className="glass rounded-2xl p-6 vibe-hover-card transition group">
            <FileText className="h-5 w-5 mb-3 text-[color:var(--neon)]" />
            <div className="font-semibold mb-1">Docs</div>
            <p className="text-xs text-muted-foreground">Living documents that autosave.</p>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition mt-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
