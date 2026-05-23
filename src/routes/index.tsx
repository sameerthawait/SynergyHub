import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/shared";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Sparkles,
  MessageSquare,
  KanbanSquare,
  FileText,
  Zap,
  Shield,
  Globe2,
  Loader2,
  Laptop,
  Users,
  Wifi,
  Database,
  Activity,
  Terminal,
  Layers,
  Send,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SynergyHub — Where teams plan, talk, and ship together" },
      {
        name: "description",
        content:
          "A multi-tenant collaboration workspace combining boards, chat, and docs — supercharged with AI.",
      },
      { property: "og:title", content: "SynergyHub — Modern team collaboration" },
      {
        property: "og:description",
        content: "Boards, chat, and docs in one workspace. AI does the busywork.",
      },
    ],
  }),
  component: Landing,
});

function AISimulator() {
  const [inputText, setInputText] = useState(
    "Product Launch Meeting Notes:\n- Finalize Stripe webhook logic for subscription plans.\n- Run database migrations on production.\n- Verify active workspace member list in settings page."
  );
  const [loading, setLoading] = useState(false);
  const [extractedCards, setExtractedCards] = useState<string[]>([]);
  const [step, setStep] = useState(0); // 0: Idle, 1: Extracting, 2: Done

  const runSimulation = () => {
    setLoading(true);
    setStep(1);
    setExtractedCards([]);

    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setExtractedCards([
        "Finalize Stripe webhook logic",
        "Run database migrations",
        "Verify active workspace members"
      ]);
      toast.success("Simulation complete! 3 Kanban cards generated.");
    }, 2200);
  };

  return (
    <div className="glass-strong rounded-3xl p-6 shadow-elegant border border-border bg-background/50 flex flex-col md:flex-row gap-6 relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none" />
      {/* Input Doc Side */}
      <div className="flex-1 space-y-3 z-10">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Interactive Document Editor</span>
          <span className="text-[10px] uppercase tracking-wider text-[color:var(--neon)] font-semibold">Gemini Extractor</span>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
          className="w-full bg-card/60 border border-border rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-ring/40 text-foreground resize-none leading-relaxed h-32"
        />
        <button
          onClick={runSimulation}
          disabled={loading || !inputText.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "AI Parsing Document..." : "Try AI Extract Tasks"}
        </button>
      </div>

      {/* Mini Kanban Board Side */}
      <div className="w-full md:w-80 flex flex-col justify-between border-l border-border/40 pl-0 md:pl-6 pt-6 md:pt-0 z-10">
        <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
          <span>Kanban Board · Todo list</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">{extractedCards.length}</span>
        </div>

        <div className="flex-1 bg-card/25 border border-dashed border-border/60 rounded-2xl p-4 min-h-[140px] flex flex-col gap-2">
          {step === 0 && (
            <p className="text-muted-foreground text-xs text-center my-auto italic leading-relaxed px-2">
              Type some notes and click the button to watch Gemini generate real-time board cards!
            </p>
          )}

          {step === 1 && (
            <div className="my-auto mx-auto flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[color:var(--neon)]" />
              <span className="text-[10px] text-muted-foreground font-mono animate-pulse">Gemini 2.5 Flash is thinking...</span>
            </div>
          )}

          {step === 2 &&
            extractedCards.map((title, i) => (
              <div
                key={title}
                className="rounded-lg bg-card p-2.5 text-xs border border-border shadow-sm flex items-center gap-2 transform transition-all duration-300 hover:border-[color:var(--neon)]/40 hover:-translate-y-0.5"
              >
                <div className="h-2 w-2 rounded-full bg-gradient-primary shrink-0" />
                <span className="truncate flex-1 font-medium">{title}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ==========================================
// REAL-TIME SYNC SIMULATOR
// ==========================================
function RealtimeSyncSimulator() {
  const [messages, setMessages] = useState([
    { sender: "Siddharth", text: "Check out the new design board!", time: "12:04" },
    { sender: "Sarah", text: "Wow, the real-time dragging is instant! ⚡", time: "12:05" },
  ]);
  const [cardStatus, setCardStatus] = useState<"todo" | "doing" | "done">("todo");
  const [syncing, setSyncing] = useState(false);
  const [pingLatency, setPingLatency] = useState(24);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "board">("chat");

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || syncing) return;

    const text = chatInput;
    setChatInput("");
    setSyncing(true);
    
    // Simulate real-time sync with randomized edge-worker low latency
    const simulatedLatency = Math.floor(Math.random() * 32) + 12;
    setPingLatency(simulatedLatency);

    // Locally add to message history
    const newMessage = { sender: "Siddharth", text, time: "Just now" };
    setMessages((prev) => [...prev, newMessage]);

    setTimeout(() => {
      setSyncing(false);
      toast.success(`Synced to Sarah's device via Supabase WebSockets (latency: ${simulatedLatency}ms)`);
    }, 350);
  };

  const handleMoveCard = (newStatus: "todo" | "doing" | "done") => {
    if (cardStatus === newStatus || syncing) return;
    setSyncing(true);

    const simulatedLatency = Math.floor(Math.random() * 25) + 8;
    setPingLatency(simulatedLatency);

    setTimeout(() => {
      setCardStatus(newStatus);
      setSyncing(false);
      toast.success(`Kanban state updated to "${newStatus}" globally in ${simulatedLatency}ms!`);
    }, 300);
  };

  return (
    <div className="glass-strong rounded-3xl p-6 md:p-8 shadow-elegant border border-border relative overflow-hidden text-left">
      {/* Glow gradient background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[color:var(--neon)]/10 to-transparent blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        
        {/* Left Side: Explanatory & Controls */}
        <div className="flex-1 space-y-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 neon-pulse-dot animate-pulse" />
              Live Supabase Realtime Simulation
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
              Test the speed of <span className="text-gradient">Real-Time Sync</span>
            </h3>
            
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              SynergyHub uses secure database WebSockets to broadcast changes under 100 milliseconds. Interact with the sandbox on the right and watch the state instantly replicate between Alexandria and San Francisco.
            </p>
          </div>

          {/* Interactive control triggers */}
          <div className="bg-card/40 rounded-2xl p-4 border border-border/50 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Select Simulation Surface:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab("chat")}
                className={`py-2 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border transition cursor-pointer ${
                  activeTab === "chat"
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/60 hover:bg-card border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Collaborative Chat
              </button>
              <button
                onClick={() => setActiveTab("board")}
                className={`py-2 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border transition cursor-pointer ${
                  activeTab === "board"
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/60 hover:bg-card border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                Kanban Sync
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/30">
              <span className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3 text-emerald-400 animate-pulse" />
                Active WebSockets: <strong className="text-foreground">Connected</strong>
              </span>
              <span className="font-mono bg-card px-2 py-0.5 rounded border border-border/30">
                P95 Latency: <span className="text-[color:var(--neon)] font-bold">{pingLatency}ms</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Dual-Client Visual Emulator */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[380px]">
          
          {/* Client A: Siddharth in Alexandria */}
          <div className="flex-1 glass rounded-2xl border border-border/60 flex flex-col overflow-hidden shadow-elegant relative group">
            {/* Header */}
            <div className="bg-card/80 px-3 py-2 border-b border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Siddharth (Alexandria)
              </div>
              <span>CLIENT_A</span>
            </div>

            {/* Viewport */}
            <div className="flex-1 p-3 bg-background/30 flex flex-col justify-between">
              {activeTab === "chat" ? (
                <>
                  {/* Chat messages */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.sender === "Siddharth" ? "items-end" : "items-start"}`}>
                        <span className="text-[9px] text-muted-foreground px-1">{m.sender}</span>
                        <div className={`p-2 rounded-xl text-xs max-w-[85%] ${
                          m.sender === "Siddharth" 
                            ? "bg-gradient-primary text-primary-foreground rounded-tr-none shadow-sm"
                            : "bg-card/70 border border-border text-foreground rounded-tl-none"
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input bar */}
                  <form onSubmit={handleSendChat} className="mt-3 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Type real-time chat..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={syncing}
                      className="flex-1 bg-card/60 border border-border/80 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring/40 text-foreground"
                    />
                    <button 
                      type="submit"
                      disabled={syncing || !chatInput.trim()}
                      className="p-1.5 rounded-xl bg-gradient-primary text-primary-foreground hover:scale-105 active:scale-95 transition disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-muted-foreground text-center italic mt-2">
                    Click to drag/move card state:
                  </div>

                  {/* Columns */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["todo", "doing", "done"] as const).map((col) => (
                      <button
                        key={col}
                        onClick={() => handleMoveCard(col)}
                        className={`p-2 rounded-xl border text-[10px] font-semibold transition uppercase tracking-wider cursor-pointer ${
                          cardStatus === col
                            ? "bg-gradient-primary/20 border-[color:var(--neon)]/60 text-foreground"
                            : "bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80"
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>

                  {/* Render simulated Card inside column */}
                  <div className="flex-1 bg-card/25 border border-dashed border-border/40 rounded-xl p-2.5 flex items-center justify-center">
                    <div className="w-full bg-card p-2.5 rounded-lg border border-border shadow-sm flex items-center gap-2 transform transition duration-300">
                      <div className={`h-2 w-2 rounded-full ${
                        cardStatus === "todo" ? "bg-amber-400" : cardStatus === "doing" ? "bg-cyan-400" : "bg-emerald-400"
                      }`} />
                      <div className="flex-1 text-[11px] font-medium truncate text-left">
                        Deploy cloudflare worker
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sync indicator animation dot */}
          <div className="hidden md:flex flex-col items-center justify-center pointer-events-none shrink-0 self-center">
            <div className={`p-2 rounded-full border border-border bg-card/80 transition-all duration-300 ${syncing ? "scale-110 shadow-glow border-[color:var(--neon)]/40" : "scale-100"}`}>
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[color:var(--neon)]" />
              ) : (
                <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
              )}
            </div>
            <span className="text-[9px] font-mono text-muted-foreground mt-1">
              {syncing ? "SYNCING" : "LIVE"}
            </span>
          </div>

          {/* Client B: Sarah in San Francisco */}
          <div className="flex-1 glass rounded-2xl border border-border/60 flex flex-col overflow-hidden shadow-elegant relative group">
            {/* Sync Overlay Indicator */}
            {syncing && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10 animate-fade-in">
                <div className="bg-card/90 border border-[color:var(--neon)]/40 rounded-2xl p-4 shadow-glow flex flex-col items-center gap-1.5 max-w-[80%]">
                  <div className="flex items-center gap-1.5 animate-pulse">
                    <Wifi className="h-4 w-4 text-[color:var(--neon)]" />
                    <span className="text-xs font-mono font-bold tracking-tight text-foreground">Syncing Webhook packet...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Postgres WAL delta replicate: <strong className="text-[color:var(--neon)]">{pingLatency}ms</strong></span>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-card/80 px-3 py-2 border-b border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Sarah (San Francisco)
              </div>
              <span>CLIENT_B</span>
            </div>

            {/* Viewport */}
            <div className="flex-1 p-3 bg-background/30 flex flex-col justify-between">
              {activeTab === "chat" ? (
                <>
                  {/* Chat messages identical copy */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.sender === "Sarah" ? "items-end" : "items-start"}`}>
                        <span className="text-[9px] text-muted-foreground px-1">{m.sender}</span>
                        <div className={`p-2 rounded-xl text-xs max-w-[85%] ${
                          m.sender === "Sarah"
                            ? "bg-gradient-primary text-primary-foreground rounded-tr-none shadow-sm"
                            : "bg-card/70 border border-border text-foreground rounded-tl-none"
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Disabled input view */}
                  <div className="mt-3 flex gap-1.5 opacity-60">
                    <div className="flex-1 bg-card/30 border border-border/40 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground select-none italic text-left">
                      Sarah is reading in real-time...
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-muted-foreground text-center italic mt-2">
                    State replicated from Client A:
                  </div>

                  {/* Readonly Columns status */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["todo", "doing", "done"] as const).map((col) => (
                      <div
                        key={col}
                        className={`p-2 rounded-xl border text-[10px] font-semibold text-center uppercase tracking-wider ${
                          cardStatus === col
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                            : "bg-card/20 border-border/20 text-muted-foreground/60"
                        }`}
                      >
                        {col}
                      </div>
                    ))}
                  </div>

                  {/* Render simulated Card inside identical column status */}
                  <div className="flex-1 bg-card/25 border border-dashed border-border/40 rounded-xl p-2.5 flex items-center justify-center">
                    <div className="w-full bg-card p-2.5 rounded-lg border border-border shadow-sm flex items-center gap-2 transform transition duration-300">
                      <div className={`h-2 w-2 rounded-full ${
                        cardStatus === "todo" ? "bg-amber-400" : cardStatus === "doing" ? "bg-cyan-400" : "bg-emerald-400"
                      }`} />
                      <div className="flex-1 text-[11px] font-medium truncate text-left font-sans">
                        Deploy cloudflare worker
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// TECHNICAL STACK ARCHITECTURE EXPLORER
// ==========================================
function StackExplorer() {
  const [selectedTech, setSelectedTech] = useState("TanStack Start");

  const techDetails: Record<
    string,
    {
      role: string;
      description: string;
      flow: string;
      benefits: string[];
      icon: any;
      metric: string;
    }
  > = {
    "TanStack Start": {
      role: "Full-stack Framework & SSR Engine",
      description:
        "TanStack Start delivers high-performance Server-Side Rendering (SSR) built on top of React 19. It creates fully hydrated client routes with flawless server function calls and zero configuration.",
      flow: "Router Request ➔ Pre-render (SSR) ➔ Client Hydration ➔ Lazy Bundles",
      benefits: ["Sub-100ms first paint metrics", "End-to-end type safety", "Direct database server-functions"],
      icon: Layers,
      metric: "Vite + SSR",
    },
    "Supabase Auth & DB": {
      role: "Identity Manager & Multi-tenant Postgres",
      description:
        "Handles identity access control, JWT session encryption, and robust storage. Armed with PostgreSQL Row-Level Security (RLS), it blocks any database access outside the active workspace tenant.",
      flow: "API Call ➔ Supabase Gateway ➔ Row-Level Security Enforcer ➔ DB Row Query",
      benefits: ["Workspace data isolation", "Instant user session validation", "Direct client-to-DB calls via SDK"],
      icon: Database,
      metric: "Postgres RLS",
    },
    "Supabase Realtime": {
      role: "Secure WebSocket Sync Engine",
      description:
        "Broadcasts PostgreSQL transactional write logs to connected clients in milliseconds. Ensures the team's sidebar, channels list, chat feeds, and kanban cards remain beautifully synced.",
      flow: "DB Update ➔ Postgres WAL ➔ Supabase WebSocket Pub/Sub ➔ Frontend State Sync",
      benefits: ["Zero polling queries needed", "Auto-reconnect fallback channels", "Global replication under 150ms"],
      icon: Wifi,
      metric: "WebSocket PubSub",
    },
    "Google Gemini 2.5": {
      role: "Next-Gen AI Workspace Productivity",
      description:
        "Integrates the Gemini API to analyze rich text notes, identify structural goals, construct fully populated Kanban tickets, write standalone reports, and summarize active team channels in real-time.",
      flow: "Document Markdown ➔ Gemini Flash 2.5 API ➔ Structured JSON Cards Array",
      benefits: ["Automated task drafting", "High-speed token computation", "Direct board list writing"],
      icon: Sparkles,
      metric: "Gemini-2.5-flash",
    },
    "Bun & Cloudflare": {
      role: "Edge Processing Runtime & Deploy Host",
      description:
        "Compiled to run on Cloudflare Workers on top of the lightning-fast Bun runtime. It delivers serverless horizontal scaling with near-zero cold-starts globally.",
      flow: "Client Request ➔ Cloudflare Edge CDN ➔ Bun Runtime execution ➔ Client response",
      benefits: ["Zero cold starts", "Scale up to 1M+ active connections", "Ultra-low edge execution cost"],
      icon: Terminal,
      metric: "Edge Workers",
    },
    "Tailwind CSS 4": {
      role: "Hardware-Accelerated OKLCH Engine",
      description:
        "Employs Tailwind CSS v4 to style the workspace. Renders high-fidelity radial lightings, deep floating shadows, shifting HSL background aurora nodes, and premium hover UI scales.",
      flow: "Tailwind 4 Compiler ➔ CSS Custom Properties ➔ GPU Accelerated Rendering",
      benefits: ["Custom glassmorphism", "Harmonious dark color palettes", "Pulsing neon status markers"],
      icon: Activity,
      metric: "OKLCH v4 Engine",
    },
  };

  const current = techDetails[selectedTech] || techDetails["TanStack Start"];
  const TechIcon = current.icon;

  return (
    <div className="glass-strong rounded-3xl p-6 md:p-10 border border-border shadow-elegant relative overflow-hidden text-left">
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Nav list of technologies */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-2 pb-4 lg:pb-0 border-b lg:border-b-0 lg:border-r border-border/40 shrink-0 scrollbar-thin">
          {Object.keys(techDetails).map((tech) => {
            const ItemIcon = techDetails[tech].icon;
            return (
              <button
                key={tech}
                onClick={() => setSelectedTech(tech)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap lg:whitespace-normal transition text-left cursor-pointer border ${
                  selectedTech === tech
                    ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                    : "bg-card/40 hover:bg-card border-border/30 text-muted-foreground hover:text-foreground"
                }`}
              >
                <ItemIcon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{tech}</span>
                <ChevronRight className={`h-3 w-3 hidden lg:block transition ${selectedTech === tech ? "translate-x-0.5 opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </div>

        {/* Dashboard Inspector Console */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-card border border-border">
                <TechIcon className="h-5 w-5 text-[color:var(--neon)]" />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-widest text-[color:var(--neon)] font-bold uppercase mb-0.5">
                  Architecture Console
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">
                  {selectedTech}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[10px] font-mono bg-card px-2.5 py-1 rounded-full border border-border text-muted-foreground flex items-center gap-1.5 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--neon)] animate-pulse" />
                {current.metric}
              </span>
            </div>
          </div>

          {/* Description Body */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Tech Role & Details */}
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 select-none">Functional Role:</div>
                <div className="text-sm font-semibold text-foreground">{current.role}</div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 select-none">Architecture Summary:</div>
                <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                  {current.description}
                </p>
              </div>
            </div>

            {/* Architecture Pipeline / Flow */}
            <div className="bg-background/40 border border-border/60 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5 select-none">
                  <Terminal className="h-3.5 w-3.5 text-[color:var(--neon)]" />
                  Data Flow Pipeline:
                </div>
                <div className="font-mono text-[10px] leading-relaxed bg-card/60 p-2.5 rounded-xl border border-border/40 text-foreground break-all text-left">
                  {current.flow}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/20 select-none">
                <span className="text-[10px] text-muted-foreground italic flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Fully integrated into active workspaces.
                </span>
              </div>
            </div>

          </div>

          {/* Benefits Grid */}
          <div className="pt-4 border-t border-border/40">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 select-none">Key Technical Advantages:</div>
            <div className="grid sm:grid-cols-3 gap-3">
              {current.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-card/20 border border-border/40 p-2.5 rounded-xl text-xs font-medium">
                  <span className="text-[color:var(--neon)] font-mono shrink-0 select-none">▸</span>
                  <span className="text-foreground/90 text-left font-sans">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition">
              Pricing
            </a>
            <a href="#stack" className="hover:text-foreground transition">
              Stack
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <span className="text-xs text-muted-foreground hidden sm:inline mr-2">
                Logged in as <strong className="text-foreground">{user.email?.split("@")[0]}</strong>
              </span>
            ) : null}
            {!loading && user ? (
              <Link
                to="/app"
                className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:scale-[1.02] transition"
              >
                Go to Workspace <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground px-3 py-2"
                >
                  Sign in
                </Link>
                <Link
                  to="/app"
                  className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:scale-[1.02] transition"
                >
                  Launch app <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div
          className="aurora-blob h-[500px] w-[500px] bg-[color:var(--aurora-1)] -top-32 -left-32"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="aurora-blob h-[600px] w-[600px] bg-[color:var(--aurora-2)] top-40 -right-40"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="aurora-blob h-[450px] w-[450px] bg-[color:var(--aurora-3)] bottom-0 left-1/3"
          style={{ animationDelay: "-12s" }}
        />
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--neon)] animate-pulse" />
              v1.0 · Gemini-powered AI inside
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              The workspace where
              <br />
              <span className="text-gradient-animated">teams actually ship.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Boards, chat, and docs unified under one tenant. Real-time across continents. AI that
              summarizes, prioritizes, and drafts so your team can focus on the work that matters.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/app"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 font-medium text-primary-foreground shadow-glow hover:scale-[1.02] transition"
              >
                Open the workspace{" "}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full glass px-6 py-3 font-medium hover:bg-card transition"
              >
                See what's inside
              </a>
            </div>
            <div className="mt-12 flex items-center gap-8 text-xs text-muted-foreground">
              <div>
                <div className="text-2xl font-bold text-foreground">99.95%</div>uptime SLO
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">&lt;150ms</div>WS latency p95
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">100k+</div>users ready
              </div>
            </div>
                    {/* Interactive AI Task Extractor Simulator Preview */}
          <div className="mt-20 relative animate-float">
            <AISimulator />
          </div>  </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl mb-16">
          <div className="text-sm text-gradient-accent font-medium mb-3">
            Everything, in one place
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Three surfaces.
            <br />
            One source of truth.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: KanbanSquare,
              title: "Boards",
              desc: "Kanban with real-time DnD, labels, due dates, checklists, comments — and AI that surfaces what to do next.",
              to: "/app/boards",
            },
            {
              icon: MessageSquare,
              title: "Chat",
              desc: "Channels, threads, presence, typing indicators. Sub-150ms across the globe via Redis-backed Socket.io.",
              to: "/app/chat",
            },
            {
              icon: FileText,
              title: "Docs",
              desc: "Block-based docs that turn into action items. Wiki, runbooks, OKRs — all searchable, all yours.",
              to: "/app/docs",
            },
          ].map((f) => (
            <Link
              key={f.title}
              to={f.to}
              className="group glass rounded-3xl p-8 hover:shadow-glow transition relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-primary opacity-0 group-hover:opacity-20 blur-3xl transition" />
              <f.icon className="h-8 w-8 mb-6 text-[color:var(--neon)]" />
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              <div className="mt-6 text-sm inline-flex items-center gap-1 text-foreground/80 group-hover:gap-2 transition">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {[
            {
              icon: Zap,
              title: "AI productivity",
              desc: "Gemini summarizes threads, prioritizes tasks, drafts replies, and extracts action items from any doc.",
            },
            {
              icon: Shield,
              title: "Tenant isolation",
              desc: "Workspace-scoped data with Postgres RLS + Prisma middleware. RBAC enforced at API and DB layers.",
            },
            {
              icon: Globe2,
              title: "Built to scale",
              desc: "Stateless API, horizontal Socket.io, Redis pub/sub, BullMQ workers. 100k MAU on day one.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-3xl p-8 border border-border bg-card/40">
              <f.icon className="h-6 w-6 mb-4 text-[color:var(--aurora-2)]" />
              <h3 className="text-lg font-bold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Real-time WebSockets Live Simulator Section */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <RealtimeSyncSimulator />
      </section>

      {/* Logo marquee */}
      <section className="border-y border-border/60 py-10 overflow-hidden">
        <div className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Trusted by teams building the next wave
        </div>
        <div className="relative">
          <div className="flex gap-16 animate-marquee whitespace-nowrap w-max">
            {[...Array(2)].flatMap((_, i) =>
              [
                "Acme",
                "Nimbus",
                "Helix",
                "Quantum",
                "Aperture",
                "Northwind",
                "Stellar",
                "Vortex",
                "Lumen",
                "Cipher",
              ].map((n) => (
                <span
                  key={`${i}-${n}`}
                  className="text-2xl font-display font-bold text-muted-foreground/50 tracking-tight"
                >
                  {n}
                </span>
              )),
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl mb-16">
          <div className="text-sm text-gradient-accent font-medium mb-3">Loved by builders</div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Teams that ship
            <br />
            don't switch tabs.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              quote:
                "Replaced three tools in a week. The AI summary alone saves my PMs an hour a day.",
              name: "Maya Chen",
              role: "Head of Eng, Helix",
            },
            {
              quote:
                "Real-time boards that actually feel real-time. Latency is invisible. Our remote team finally feels in-sync.",
              name: "Dario Rossi",
              role: "CTO, Nimbus Labs",
            },
            {
              quote:
                "Tenant isolation done right. RLS + audit log got us through SOC2 without a sweat.",
              name: "Priya Natarajan",
              role: "Security Lead, Quantum",
            },
          ].map((t) => (
            <div key={t.name} className="glass rounded-3xl p-8 relative">
              <div className="text-4xl text-[color:var(--neon)] leading-none mb-4">"</div>
              <p className="text-foreground/90 leading-relaxed mb-6">{t.quote}</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl mb-16">
          <div className="text-sm text-gradient-accent font-medium mb-3">Pricing</div>
          <h2 className="text-4xl md:text-5xl font-bold">
            Pay for seats.
            <br />
            Not for surprises.
          </h2>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            {
              name: "Free",
              price: "$0",
              per: "forever",
              desc: "For small squads",
              features: ["Up to 10 members", "3 boards", "Community support"],
            },
            {
              name: "Pro",
              price: "$8",
              per: "per seat / mo",
              desc: "Growing teams",
              features: ["Unlimited boards", "AI: 100k tokens/mo", "Email support"],
              highlight: true,
            },
            {
              name: "Business",
              price: "$16",
              per: "per seat / mo",
              desc: "Scaling orgs",
              features: ["AI: 1M tokens/mo", "SSO + audit log", "Priority support"],
            },
            {
              name: "Enterprise",
              price: "Custom",
              per: "talk to us",
              desc: "Large org needs",
              features: ["SAML SSO", "Dedicated shard", "99.95% SLA"],
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-3xl p-6 ${p.highlight ? "glass-strong shadow-glow ring-1 ring-[color:var(--neon)]/40" : "glass"}`}
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                {p.name}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-xs text-muted-foreground">{p.per}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{p.desc}</p>
              <ul className="space-y-2 text-sm mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-[color:var(--neon)] mt-1">▸</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/app"
                className={`block text-center rounded-full py-2 text-sm font-medium transition ${p.highlight ? "bg-gradient-primary text-primary-foreground hover:scale-[1.02]" : "border border-border hover:bg-card"}`}
              >
                {p.name === "Enterprise" ? "Contact sales" : "Start free"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="mx-auto max-w-7xl px-6 py-24 text-center space-y-12">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Activity className="h-3.5 w-3.5" />
            System Blueprint & Technical Stack
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">Production-grade, modern architecture.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            Discover how SynergyHub integrates server-side rendering, edge runtimes, row-level database security, and Google Generative AI to achieve sub-100ms globally synced experiences. Click any layer below to explore details.
          </p>
        </div>
        
        <StackExplorer />
      </section>

      <footer className="border-t border-border bg-card/10 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Logo />
            <div className="text-xs text-muted-foreground mt-1">© 2026 SynergyHub. Built for teams that ship.</div>
          </div>
          
          {/* Creator Credits Badge */}
          <div className="glass-strong px-4 py-3 rounded-2xl border border-border/80 flex items-center gap-3 shadow-glow group hover:border-[color:var(--neon)]/40 transition duration-300">
            <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground font-mono">
              ST
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-mono tracking-widest text-[color:var(--neon)] font-bold">Creator & Designer</div>
              <div className="text-xs font-bold text-foreground font-sans">Designed & Built by Sameer Thawait</div>
              <div className="flex items-center gap-2.5 mt-1 text-[11px] font-medium font-sans">
                <a 
                  href="https://github.com/sameerthawait" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-[color:var(--neon)] transition flex items-center gap-0.5 font-semibold"
                >
                  GitHub
                </a>
                <span className="text-muted-foreground/30">•</span>
                <a 
                  href="https://www.linkedin.com/in/sameer-thawait-47528a291" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-[color:var(--neon)] transition flex items-center gap-0.5 font-semibold"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
