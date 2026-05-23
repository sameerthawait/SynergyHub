import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, FileText, Loader2, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { DatabaseSetupRequired } from "@/components/database-setup-required";
import { useServerFn } from "@tanstack/react-start";
import { extractCards } from "@/lib/ai.functions";

export const Route = createFileRoute("/app/docs")({
  component: DocsPage,
});

type Doc = { id: string; title: string; emoji: string; body: string; updated_at: string };

const EMOJIS = ["📄", "📝", "📐", "🎯", "🔐", "🧠", "🎨", "🚀", "💡", "📊", "🛠️", "🌐"];

function DocsPage() {
  const { workspace, loading: wsLoading, error: wsError } = useWorkspace();
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const runExtractCards = useServerFn(extractCards);

  const load = useCallback(async (wsId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("id,title,emoji,body,updated_at")
      .eq("workspace_id", wsId)
      .order("updated_at", { ascending: false });
    setDocs(data ?? []);
    if (data && data.length) setActive((cur) => cur ?? data[0]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (workspace) load(workspace.id);
  }, [workspace, load]);

  // Debounced auto-save
  useEffect(() => {
    if (!active) return;
    setSaving(true);
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("documents")
        .update({ title: active.title, emoji: active.emoji, body: active.body })
        .eq("id", active.id);
      if (error) toast.error(error.message);
      setDocs((prev) =>
        prev.map((d) =>
          d.id === active.id
            ? { ...d, title: active.title, emoji: active.emoji, body: active.body }
            : d,
        ),
      );
      setSaving(false);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.title, active?.emoji, active?.body]);

  const createDoc = async () => {
    if (!workspace || !user) return;
    const { data, error } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspace.id,
        title: "Untitled",
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        body: "",
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setDocs((p) => [data, ...p]);
    setActive(data);
    toast.success("Doc created");
  };

  const deleteDoc = async () => {
    if (!active) return;
    const { error } = await supabase.from("documents").delete().eq("id", active.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const remaining = docs.filter((d) => d.id !== active.id);
    setDocs(remaining);
    setActive(remaining[0] ?? null);
    toast.success("Doc deleted");
  };

  const runExtract = async () => {
    if (!active || !active.body.trim()) {
      toast.error("Please add some text to the document before extracting tasks.");
      return;
    }

    setExtracting(true);
    try {
      const res = await runExtractCards({ data: { docId: active.id } });
      if (res.created > 0) {
        toast.success(`Successfully extracted ${res.created} task(s)!`, {
          description: `Added to your Kanban Board: ${res.tasks?.join(", ")}`,
        });
      } else {
        toast.info("AI analyzed your document but found no new actionable tasks.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExtracting(false);
    }
  };

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  if (wsLoading || loading)
    return (
      <div className="h-full grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (wsError) return <DatabaseSetupRequired message={wsError} />;

  return (
    <div className="h-full flex">
      <aside className="w-72 shrink-0 border-r border-border bg-card/30 flex flex-col">
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Docs</h2>
            <button onClick={createDoc} className="text-muted-foreground hover:text-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-card border border-border text-xs outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
          {filtered.map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d)}
              className={`w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition ${active?.id === d.id ? "bg-gradient-primary text-primary-foreground" : "hover:bg-card text-foreground/80"}`}
            >
              <span className="text-lg leading-none mt-0.5">{d.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{d.title || "Untitled"}</div>
                <div
                  className={`text-[10px] ${active?.id === d.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {new Date(d.updated_at).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">No docs yet</div>
          )}
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {active ? (
          <div className="max-w-3xl mx-auto px-12 py-12">
            <div className="text-xs text-muted-foreground flex items-center gap-2 mb-6">
              <FileText className="h-3 w-3" /> Docs / {active.title || "Untitled"}
              <span className="ml-auto">{saving ? "Saving…" : "Saved"}</span>
              <button
                disabled={extracting}
                onClick={runExtract}
                className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-accent text-accent-foreground text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-40 shadow-glow"
                title="AI Extract Action Items to Kanban Board"
              >
                <Sparkles className="h-3 w-3" />
                {extracting ? "Extracting..." : "AI Extract Tasks"}
              </button>
              <button onClick={deleteDoc} className="p-1 hover:bg-card rounded text-destructive ml-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <select
              value={active.emoji}
              onChange={(e) => setActive({ ...active, emoji: e.target.value })}
              className="text-6xl mb-4 bg-transparent outline-none cursor-pointer"
            >
              {EMOJIS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>

            <input
              value={active.title}
              onChange={(e) => setActive({ ...active, title: e.target.value })}
              className="w-full text-5xl font-bold tracking-tight mb-6 bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Untitled"
            />

            <textarea
              value={active.body}
              onChange={(e) => setActive({ ...active, body: e.target.value })}
              placeholder="Start writing… markdown supported."
              className="w-full bg-transparent outline-none text-base leading-relaxed min-h-[400px] resize-none placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <div className="h-full grid place-items-center text-muted-foreground">
            <div className="text-center space-y-3">
              <p>No documents yet.</p>
              <button
                onClick={createDoc}
                className="text-sm px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground font-medium"
              >
                Create your first doc
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
