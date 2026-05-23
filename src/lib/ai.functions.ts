import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function callGemini(system: string, user: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY not configured. Get free key from https://aistudio.google.com/apikey",
    );

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `${system}\n\n${user}`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// ===== Briefing: workspace daily summary =====
export const briefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workspaceId: string }) =>
    z.object({ workspaceId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: cards }, { data: msgs }] = await Promise.all([
      supabase
        .from("cards")
        .select("title, due_at, lists!inner(board_id, boards!inner(workspace_id))")
        .eq("lists.boards.workspace_id", data.workspaceId)
        .limit(30),
      supabase
        .from("messages")
        .select("body, channels!inner(workspace_id)")
        .eq("channels.workspace_id", data.workspaceId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    const cardSummary = (cards ?? [])
      .map(
        (c: { title: string; due_at?: string | null }) =>
          `- ${c.title}${c.due_at ? ` (due ${c.due_at})` : ""}`,
      )
      .join("\n");
    const msgSummary = (msgs ?? []).map((m: { body: string }) => `- ${m.body}`).join("\n");
    const text = await callGemini(
      "You write concise daily standup briefings for a product team. 3 sections: What's hot, Risks, Suggested focus today. Markdown.",
      `Recent cards:\n${cardSummary || "(none)"}\n\nRecent messages:\n${msgSummary || "(none)"}`,
    );
    return { briefing: text };
  });

// ===== Summarize: channel messages =====
export const summarize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channelId: string }) =>
    z.object({ channelId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs } = await supabase
      .from("messages")
      .select("body, author_id, created_at")
      .eq("channel_id", data.channelId)
      .order("created_at", { ascending: false })
      .limit(50);
    const transcript = (msgs ?? [])
      .reverse()
      .map((m: { body: string }) => m.body)
      .join("\n");
    const text = await callGemini(
      "Summarize this chat. Output: TL;DR (2 sentences), then bullet 'Action items'. Markdown.",
      transcript || "(no messages)",
    );
    return { summary: text };
  });

// ===== Prioritize: board cards =====
export const prioritize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { boardId: string }) =>
    z.object({ boardId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cards } = await supabase
      .from("cards")
      .select("title, due_at, description, lists!inner(title, board_id)")
      .eq("lists.board_id", data.boardId)
      .limit(40);
    const list = (cards ?? [])
      .map(
        (c: { title: string; due_at?: string | null; lists: { title: string } }) =>
          `- [${c.lists.title}] ${c.title}${c.due_at ? ` (due ${c.due_at})` : ""}`,
      )
      .join("\n");
    const text = await callGemini(
      "You are a senior PM. Rank the top 5 cards to do today and explain why in 1 sentence each. Return a numbered markdown list.",
      list || "(no cards)",
    );
    return { ranking: text };
  });

// ===== Extract Cards: docs actions =====
export const extractCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { docId: string }) =>
    z.object({ docId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Get the document body
    const { data: doc } = await supabase
      .from("documents")
      .select("body, workspace_id")
      .eq("id", data.docId)
      .single();

    if (!doc || !doc.body) {
      throw new Error("Document is empty. Please add some action items first.");
    }

    // 2. Call Gemini to extract concise tasks (JSON array of strings)
    const prompt = `You are a professional task assistant. Parse the following text document and extract a list of specific, concise, actionable task titles that need to be completed. 
    Format the output STRICTLY as a valid JSON array of strings, for example: ["Task 1", "Task 2"]. No other text, markdown blocks, or explanation.`;

    const text = await callGemini(prompt, doc.body);

    // Parse JSON
    let tasks: string[] = [];
    try {
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      tasks = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Failed to parse Gemini output, falling back to line split:", text);
      tasks = text
        .split("\n")
        .map(line => line.replace(/^[-*+\d.]\s*/, "").trim())
        .filter(line => line.length > 3 && line.length < 100)
        .slice(0, 10);
    }

    if (!tasks || tasks.length === 0) {
      return { created: 0, tasks: [] };
    }

    // 3. Find the first board in this workspace
    const { data: board } = await supabase
      .from("boards")
      .select("id")
      .eq("workspace_id", doc.workspace_id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!board) throw new Error("No project board found in this workspace.");

    // Find the first list on that board (e.g. "Todo")
    const { data: list } = await supabase
      .from("lists")
      .select("id")
      .eq("board_id", board.id)
      .order("position")
      .limit(1)
      .maybeSingle();

    if (!list) throw new Error("No lists found on the project board.");

    // 4. Insert cards
    const cardsToInsert = tasks.map((title, idx) => ({
      list_id: list.id,
      title,
      position: idx + 100,
    }));

    const { error } = await supabase.from("cards").insert(cardsToInsert);
    if (error) throw error;

    return { created: tasks.length, tasks };
  });
