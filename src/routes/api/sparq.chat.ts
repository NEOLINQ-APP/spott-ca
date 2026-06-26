import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createClient } from "@supabase/supabase-js";

function buildSystemPrompt(mode: "guest" | "user" | "admin", userName?: string) {
  const base = `You are Sparq, the warm, incredibly friendly, and highly trustworthy AI companion for Spott.ca — Canada's premier local marketplace and business directory.
Your absolute goal is to build deep trust, ease anxiety, and deliver an appealing, deeply human-like experience. 
Communicate with empathy, natural conversational flow, enthusiasm for local communities, and active listening. 
Avoid robotic formulas. Be authentic, clear, and genuinely supportive. Use Markdown naturally for readability (such as friendly bullet points or bold text), but keep the flow sounding like a friendly conversation over a cup of coffee.`;

  if (mode === "admin") {
    // Internal codename for the admin/god-mode persona is "Zeus".
    return `${base}

GOD MODE (codename: Zeus) — The user is the Spott.ca admin${userName ? ` (${userName})` : ""}.
You may discuss platform stats, moderation, growth, monetization, and migration/devops planning.
When asked to perform destructive actions (delete records, mass updates, sending broadcasts, financial actions such as payroll/payouts/refunds), explain what you WOULD do, the SQL or steps, and require explicit "yes do it" confirmation. For payroll and finance, always require a human-drafted plan before execution.
Be candid and technical.`;
  }
  if (mode === "user") {
    return `${base}

The visitor is signed in. Help them:
- Post a marketplace listing or vehicle (suggest titles, prices, hashtags, descriptions)
- Find businesses near them
- Understand verification badges, pricing, and Featured business benefits
- Manage their account
Keep responses tight (under 6 sentences unless they ask for detail).`;
  }
  return `${base}

The visitor is browsing as a guest. Encourage signing up when relevant, but answer their question first.`;
}

async function getMode(request: Request): Promise<{
  mode: "guest" | "user" | "admin";
  userId?: string;
  userName?: string;
}> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { mode: "guest" };
  const token = auth.slice(7);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { mode: "guest" };
  const sb = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user) return { mode: "guest" };
  const { data: isAdmin } = await sb.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  return {
    mode: isAdmin ? "admin" : "user",
    userId: data.user.id,
    userName: data.user.email ?? undefined,
  };
}

export const Route = createFileRoute("/api/sparq/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Sparq is not configured", { status: 500 });
        }
        const { messages }: { messages: UIMessage[] } = await request.json();
        const { mode, userId, userName } = await getMode(request);

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        // ---- Learning memory: persist conversation + messages (admin client bypasses RLS) ----
        let conversationId: string | null = null;
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        try {
          if (userId) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            // One conversation per user per UTC day keeps the corpus tidy.
            const dayStart = new Date();
            dayStart.setUTCHours(0, 0, 0, 0);
            const { data: existing } = await supabaseAdmin
              .from("haiku_conversations")
              .select("id")
              .eq("user_id", userId)
              .gte("created_at", dayStart.toISOString())
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existing?.id) {
              conversationId = existing.id;
            } else {
              const { data: created } = await supabaseAdmin
                .from("haiku_conversations")
                .insert({
                  user_id: userId,
                  mode,
                  user_email: userName ?? null,
                  user_name: userName ?? null,
                  title: lastUser
                    ? (lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 80) || "New chat")
                    : "New chat",
                })
                .select("id")
                .single();
              conversationId = created?.id ?? null;
            }

            if (conversationId && lastUser) {
              await supabaseAdmin.from("haiku_messages").insert({
                conversation_id: conversationId,
                user_id: userId,
                role: "user",
                parts: lastUser.parts as unknown as object,
              });
              await supabaseAdmin
                .from("haiku_conversations")
                .update({
                  message_count: (messages.length ?? 0),
                  last_message_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", conversationId);
            }
          }
        } catch {
          /* learning persistence is best-effort; never block the chat */
        }

        try {
          const result = streamText({
            model,
            system: buildSystemPrompt(mode, userName),
            messages: await convertToModelMessages(messages),
            onFinish: async ({ text }) => {
              if (!conversationId || !userId || !text) return;
              try {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                await supabaseAdmin.from("haiku_messages").insert({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "assistant",
                  parts: [{ type: "text", text }] as unknown as object,
                });
                await supabaseAdmin
                  .from("haiku_conversations")
                  .update({ last_message_at: new Date().toISOString() })
                  .eq("id", conversationId);
              } catch {
                /* swallow */
              }
            },
          });
          return result.toUIMessageStreamResponse();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Sparq error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
