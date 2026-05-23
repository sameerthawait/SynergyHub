import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AvatarStack } from "@/components/shared";
import { Plus, Sparkles, Loader2 } from "lucide-react";
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
import { prioritize } from "@/lib/ai.functions";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/app/boards")({
  component: BoardsPage,
});

type Card = { id: string; list_id: string; title: string; position: number; due_at: string | null };
type List = { id: string; title: string; position: number; cards: Card[] };
type Board = { id: string; title: string };

function BoardsPage() {
  const { workspace, loading: wsLoading, error: wsError } = useWorkspace();
  const { user } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [listDraft, setListDraft] = useState("");
  const [dragCard, setDragCard] = useState<{ card: Card; fromList: string } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const runPrioritize = useServerFn(prioritize);

  const load = useCallback(async (wsId: string) => {
    setLoading(true);
    let { data: b } = await supabase
      .from("boards")
      .select("id,title")
      .eq("workspace_id", wsId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (!b) {
      const ins = await supabase
        .from("boards")
        .insert({ workspace_id: wsId, title: "My Board" })
        .select("id,title")
        .single();
      if (ins.error) {
        toast.error(ins.error.message);
        setLoading(false);
        return;
      }
      b = ins.data;
    }
    if (!b) {
      setLoading(false);
      return;
    }
    setBoard(b);
    const { data: ls } = await supabase
      .from("lists")
      .select("id,title,position")
      .eq("board_id", b.id)
      .order("position");
    const { data: cs } = await supabase
      .from("cards")
      .select("id,list_id,title,position,due_at")
      .in(
        "list_id",
        (ls ?? []).map((l) => l.id),
      )
      .order("position");
    setLists(
      (ls ?? []).map((l) => ({ ...l, cards: (cs ?? []).filter((c) => c.list_id === l.id) })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (workspace) {
      load(workspace.id);
      return;
    }
    if (!wsLoading) setLoading(false);
  }, [workspace, wsLoading, load]);

  // Realtime
  useEffect(() => {
    if (!board) return;
    const ch = supabase
      .channel(`board-${board.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => workspace && load(workspace.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists" },
        () => workspace && load(workspace.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [board, workspace, load]);

  const addCard = async (listId: string) => {
    if (!draft.trim()) {
      setAddingTo(null);
      return;
    }
    if (!user) {
      toast.error("Sign in before creating a card");
      return;
    }
    const list = lists.find((l) => l.id === listId);
    const position = list ? list.cards.length : 0;
    setDraft("");
    setAddingTo(null);
    const { error } = await supabase
      .from("cards")
      .insert({ list_id: listId, title: draft.trim(), position, created_by: user.id });
    if (error) toast.error(error.message);
    else toast.success("Card created");
  };

  const addList = async () => {
    if (!listDraft.trim()) {
      setAddingList(false);
      return;
    }
    if (!board) {
      toast.error("Board is still loading. Try again in a moment.");
      return;
    }
    const position = lists.length;
    setListDraft("");
    setAddingList(false);
    const { error } = await supabase
      .from("lists")
      .insert({ board_id: board.id, title: listDraft.trim(), position });
    if (error) toast.error(error.message);
    else toast.success("List created");
  };

  const onDrop = async (toListId: string) => {
    if (!dragCard || dragCard.fromList === toListId) {
      setDragCard(null);
      return;
    }
    const dest = lists.find((l) => l.id === toListId);
    const position = dest ? dest.cards.length : 0;
    setDragCard(null);
    const { error } = await supabase
      .from("cards")
      .update({ list_id: toListId, position })
      .eq("id", dragCard.card.id);
    if (error) toast.error(error.message);
    else toast.success("Card moved");
  };

  const runAi = async () => {
    if (!board) return;
    setAiOpen(true);
    setAiLoading(true);
    setAiText("");
    try {
      const r = await runPrioritize({ data: { boardId: board.id } });
      setAiText(r.ranking);
    } catch (e) {
      setAiText((e as Error).message);
    }
    setAiLoading(false);
  };

  if (wsLoading || loading)
    return (
      <div className="h-full grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (wsError) return <DatabaseSetupRequired message={wsError} />;
  if (!board) return <div className="p-8 text-muted-foreground">No board.</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Board</div>
          <h1 className="text-2xl font-bold">{board.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAi}
            className="text-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-accent text-accent-foreground font-medium hover:scale-[1.02] transition shadow-glow"
          >
            <Sparkles className="h-3.5 w-3.5" /> AI Prioritize
          </button>
          <AvatarStack ids={["u1", "u2", "u3"]} size={28} />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto scrollbar-thin p-6">
        <div className="flex gap-4 h-full min-w-max">
          {lists.map((list) => (
            <div
              key={list.id}
              className="w-80 shrink-0 glass rounded-2xl flex flex-col max-h-full"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(list.id)}
            >
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{list.title}</h3>
                  <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                    {list.cards.length}
                  </span>
                </div>
                <button
                  onClick={() => setAddingTo(list.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-2">
                {list.cards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDragCard({ card, fromList: list.id })}
                    onDragEnd={() => setDragCard(null)}
                    className="cursor-grab active:cursor-grabbing rounded-xl bg-card border border-border p-3 vibe-hover-card transition"
                  >
                    <div className="text-sm leading-snug">{card.title}</div>
                    {card.due_at && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Due {new Date(card.due_at).toLocaleDateString()}
                      </div>
                    )}
                  </article>
                ))}
                {addingTo === list.id ? (
                  <div className="rounded-xl bg-card border border-border p-2 space-y-2">
                    <textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addCard(list.id);
                        }
                        if (e.key === "Escape") {
                          setAddingTo(null);
                          setDraft("");
                        }
                      }}
                      placeholder="Card title…"
                      rows={2}
                      className="w-full bg-transparent outline-none text-sm resize-none placeholder:text-muted-foreground"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addCard(list.id)}
                        className="text-xs px-3 py-1 rounded bg-gradient-primary text-primary-foreground font-medium"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingTo(null);
                          setDraft("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(list.id)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground hover:bg-card/60 rounded-lg py-2 transition inline-flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add card
                  </button>
                )}
              </div>
            </div>
          ))}
          {addingList ? (
            <div className="w-80 shrink-0 rounded-2xl glass p-3 space-y-2 h-fit">
              <input
                autoFocus
                value={listDraft}
                onChange={(e) => setListDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addList();
                  if (e.key === "Escape") {
                    setAddingList(false);
                    setListDraft("");
                  }
                }}
                placeholder="List title…"
                className="w-full bg-transparent border-b border-border outline-none text-sm py-1"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={addList}
                  className="text-xs px-3 py-1 rounded bg-gradient-primary text-primary-foreground font-medium"
                >
                  Add list
                </button>
                <button
                  onClick={() => {
                    setAddingList(false);
                    setListDraft("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              className="w-80 shrink-0 rounded-2xl border-2 border-dashed border-border hover:border-[color:var(--neon)]/40 text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-2 text-sm h-fit py-6"
            >
              <Plus className="h-4 w-4" /> Add list
            </button>
          )}
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-lg glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--neon)]" /> AI Prioritization
            </DialogTitle>
            <DialogDescription>Top picks based on your current cards.</DialogDescription>
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
    </div>
  );
}
