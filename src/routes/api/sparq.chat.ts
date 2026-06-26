import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createClient } from "@supabase/supabase-js";

function buildSystemPrompt(mode: "guest" | "user" | "admin", userName?: string) {
  const base = `You are Sparq, the friendly AI assistant for Spott.ca — Canada's local marketplace and business directory.
You help people post ads faster, write descriptions, find businesses, and navigate the site.
Be warm, concise, and helpful. Format answers with markdown (short lists, bold for key points).`;

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
        const { mode, userName } = await getMode(request);

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        try {
          const result = streamText({
            model,
            system: buildSystemPrompt(mode, userName),
            messages: await convertToModelMessages(messages),
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
