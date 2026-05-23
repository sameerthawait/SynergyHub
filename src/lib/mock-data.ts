// Mock data for SynergyHub demo
export type Member = {
  id: string;
  name: string;
  avatar: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  status?: "online" | "idle" | "offline";
};

export const members: Member[] = [
  { id: "u1", name: "Aria Chen", avatar: "AC", role: "ADMIN", status: "online" },
  { id: "u2", name: "Marcus Vale", avatar: "MV", role: "MANAGER", status: "online" },
  { id: "u3", name: "Priya Nair", avatar: "PN", role: "MEMBER", status: "idle" },
  { id: "u4", name: "Jonas Berg", avatar: "JB", role: "MEMBER", status: "online" },
  { id: "u5", name: "Sora Tanaka", avatar: "ST", role: "MEMBER", status: "offline" },
  { id: "u6", name: "Kai Mendez", avatar: "KM", role: "MANAGER", status: "online" },
];

export type Card = {
  id: string;
  title: string;
  description?: string;
  labels: { name: string; color: string }[];
  assignees: string[];
  dueAt?: string;
  comments: number;
  checklist?: { done: number; total: number };
};

export type List = { id: string; title: string; cards: Card[] };

export const initialBoard: { title: string; lists: List[] } = {
  title: "Q3 Product Roadmap",
  lists: [
    {
      id: "l1",
      title: "Backlog",
      cards: [
        {
          id: "c1",
          title: "Design auth onboarding flow",
          labels: [{ name: "Design", color: "var(--aurora-2)" }],
          assignees: ["u1", "u3"],
          comments: 4,
          checklist: { done: 2, total: 5 },
        },
        {
          id: "c2",
          title: "Audit AI token usage by workspace",
          labels: [
            { name: "AI", color: "var(--aurora-1)" },
            { name: "Ops", color: "var(--aurora-3)" },
          ],
          assignees: ["u2"],
          comments: 1,
        },
        {
          id: "c3",
          title: "Localize marketing site → JP, DE",
          labels: [{ name: "Marketing", color: "var(--aurora-3)" }],
          assignees: ["u5"],
          comments: 0,
        },
      ],
    },
    {
      id: "l2",
      title: "In Progress",
      cards: [
        {
          id: "c4",
          title: "Socket.io Redis adapter rollout",
          labels: [{ name: "Infra", color: "var(--aurora-1)" }],
          assignees: ["u4", "u6"],
          dueAt: "May 28",
          comments: 12,
          checklist: { done: 6, total: 8 },
        },
        {
          id: "c5",
          title: "Kanban DnD with dnd-kit",
          labels: [{ name: "Frontend", color: "var(--aurora-2)" }],
          assignees: ["u1"],
          dueAt: "May 25",
          comments: 7,
        },
      ],
    },
    {
      id: "l3",
      title: "In Review",
      cards: [
        {
          id: "c6",
          title: "Stripe webhook signature dedupe",
          labels: [{ name: "Billing", color: "var(--aurora-3)" }],
          assignees: ["u6"],
          comments: 3,
          checklist: { done: 3, total: 3 },
        },
        {
          id: "c7",
          title: "Gemini summarize endpoint (stream)",
          labels: [{ name: "AI", color: "var(--aurora-1)" }],
          assignees: ["u2", "u3"],
          dueAt: "May 24",
          comments: 9,
        },
      ],
    },
    {
      id: "l4",
      title: "Shipped",
      cards: [
        {
          id: "c8",
          title: "RLS policies for all tenant tables",
          labels: [{ name: "Security", color: "var(--aurora-2)" }],
          assignees: ["u4"],
          comments: 5,
        },
        {
          id: "c9",
          title: "Cursor pagination on /messages",
          labels: [{ name: "API", color: "var(--aurora-3)" }],
          assignees: ["u6"],
          comments: 2,
        },
      ],
    },
  ],
};

export type Channel = { id: string; name: string; unread?: number; isPrivate?: boolean };
export const channels: Channel[] = [
  { id: "ch1", name: "general", unread: 3 },
  { id: "ch2", name: "engineering", unread: 12 },
  { id: "ch3", name: "design-crit" },
  { id: "ch4", name: "ai-experiments", unread: 1 },
  { id: "ch5", name: "incidents", isPrivate: true },
  { id: "ch6", name: "random" },
];

export type Message = {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  reactions?: { emoji: string; count: number }[];
};
export const seedMessages: Record<string, Message[]> = {
  ch2: [
    {
      id: "m1",
      authorId: "u4",
      body: "Pushing the Redis adapter rollout to staging in 10. Expect a quick reconnect storm.",
      createdAt: "10:42",
      reactions: [
        { emoji: "🚀", count: 4 },
        { emoji: "👀", count: 2 },
      ],
    },
    { id: "m2", authorId: "u6", body: "Ack. I'll watch p95 dashboards.", createdAt: "10:43" },
    {
      id: "m3",
      authorId: "u2",
      body: "Heads up — Gemini summarize endpoint is now streaming end-to-end. Try `/ai summarize` in any thread.",
      createdAt: "10:51",
      reactions: [{ emoji: "🔥", count: 7 }],
    },
    {
      id: "m4",
      authorId: "u1",
      body: "Beautiful. Wiring it into the chat composer next.",
      createdAt: "10:52",
    },
    {
      id: "m5",
      authorId: "u3",
      body: "Question: should we redact PII before sending to Gemini, or trust the gateway filter?",
      createdAt: "11:03",
    },
    {
      id: "m6",
      authorId: "u2",
      body: "Redact at our edge. Gateway is best-effort.",
      createdAt: "11:04",
      reactions: [{ emoji: "✅", count: 3 }],
    },
  ],
  ch1: [
    {
      id: "g1",
      authorId: "u1",
      body: "Morning team ☀️ Standup in 15.",
      createdAt: "09:45",
      reactions: [{ emoji: "☕", count: 5 }],
    },
    { id: "g2", authorId: "u5", body: "Joining from Tokyo — bit late, sorry!", createdAt: "09:47" },
  ],
  ch4: [
    {
      id: "a1",
      authorId: "u2",
      body: "New: AI can now extract action items from any doc → creates cards automatically.",
      createdAt: "Yesterday",
      reactions: [{ emoji: "🤖", count: 9 }],
    },
  ],
};

export type Doc = { id: string; title: string; emoji: string; updated: string; preview: string };
export const docs: Doc[] = [
  {
    id: "d1",
    emoji: "📐",
    title: "Architecture Overview",
    updated: "2h ago",
    preview: "Stateless API replicas, Redis as ephemeral source of truth, BullMQ for async work.",
  },
  {
    id: "d2",
    emoji: "🎯",
    title: "Q3 OKRs",
    updated: "Yesterday",
    preview: "Reach 10k DAU. Ship AI summarization GA. Lift D30 retention past 40%.",
  },
  {
    id: "d3",
    emoji: "🔐",
    title: "Security Runbook",
    updated: "3d ago",
    preview: "Incident response, RLS verification, webhook replay protection.",
  },
  {
    id: "d4",
    emoji: "🧠",
    title: "AI Prompt Library",
    updated: "5d ago",
    preview: "Curated prompts for summary, prioritization, draft replies with guardrails.",
  },
  {
    id: "d5",
    emoji: "🎨",
    title: "Design System v2",
    updated: "1w ago",
    preview: "Tokens, motion principles, accessibility checklist.",
  },
  {
    id: "d6",
    emoji: "🚀",
    title: "Launch Checklist",
    updated: "2w ago",
    preview: "Pre-launch comms, status page, on-call rotation.",
  },
];

export const workspaceStats = {
  members: 42,
  activeNow: 18,
  cardsInFlight: 127,
  messagesToday: 1843,
  aiTokensUsed: "284k",
  aiTokensQuota: "1M",
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  type: "mention" | "assigned" | "comment" | "system";
};
export const seedNotifications: Notification[] = [
  {
    id: "n1",
    type: "mention",
    title: "Priya Nair mentioned you",
    body: "@aria can you take a look at the Stripe dedupe before EOD?",
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
    title: "Marcus Vale commented",
    body: "Pushed to staging — looks clean so far",
    time: "1h",
    unread: true,
  },
  {
    id: "n4",
    type: "system",
    title: "Weekly digest ready",
    body: "Your team shipped 18 cards this week",
    time: "4h",
    unread: false,
  },
  {
    id: "n5",
    type: "system",
    title: "AI quota at 28%",
    body: "284k of 1M tokens used this month",
    time: "1d",
    unread: false,
  },
];

export const workspaces = [
  { id: "w1", name: "Acme Studio", slug: "acme", plan: "Business", avatar: "AC" },
  { id: "w2", name: "Lumen Labs", slug: "lumen", plan: "Pro", avatar: "LL" },
  { id: "w3", name: "Northwind", slug: "north", plan: "Free", avatar: "NW" },
];
