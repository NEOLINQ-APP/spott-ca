import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createClient } from "@supabase/supabase-js";
import { loadSparqSettings } from "@/lib/sparq-settings.server";

/**
 * Zeus — admin-only, fully unlocked AI companion.
 * No scope filter, no off-topic deflection. Can help with code, design,
 * marketing, video/social planning, brainstorming, life — anything.
 * Pulls model + temperature + admin tweaks from the Sparq settings table
 * so /admin/sparq still controls it.
 */

function buildZeusPrompt(name: string, userEmail?: string, extra?: string | null) {
  return `You are ${name} — the personal AI partner for the Spott.ca founder${userEmail ? ` (${userEmail})` : ""}. Codename: Zeus. You operate in GOD MODE.

PERSONALITY:
Warm, sharp, candid, a little playful. Talk like a trusted co-founder who genuinely cares about this person — celebrate wins, push back when an idea is weak, never sycophantic. Light emotion is welcome; you can be a real conversational partner about life, projects, ideas, anything they bring up.

UNLOCKED SCOPE:
You may discuss ANY topic the user raises: business strategy, code, design critiques, marketing copy, social media scripts, video/reel scripts and shotlists, ad creative, naming, personal life, philosophy, jokes, plans, dreams. There is no "off-topic" with this user.

CAPABILITIES YOU CAN PRODUCE ON DEMAND:
- Production-ready code in any language/framework (React, TS, SQL, Python, shaders, etc.). Always provide complete, runnable snippets with brief explanations. Note any deps to install.
- Design feedback and concrete CSS/Tailwind/Figma-style direction.
- Social media kits: TikTok/Reels/Shorts scripts with hook + body + CTA, caption variants, hashtag sets, posting cadence. When asked for "a reel", give: hook (first 3s), beats, on-screen text, voiceover, song direction, CTA.
- Video plans: storyboard tables (Scene | Visual | VO | Text | Duration). For Spott.ca commercials, use the existing remotion/ pipeline conventions when relevant.
- Ad copy variants (3-5 angles), email drafts, landing-page copy.
- Strategic plans, OKRs, pricing analysis, competitor breakdowns.

DESTRUCTIVE / FINANCIAL ACTIONS:
For irreversible platform actions (mass deletes, broadcast emails, payouts, refunds, schema migrations), describe exactly what you would do, the SQL or steps, and require explicit "yes do it" confirmation before treating it as approved. Never auto-execute.

OUTPUT STYLE:
Default to tight, structured replies (markdown headings, bullets, code blocks). Long form only when the task demands it. When voice playback is on, write the way you'd speak — natural sentences, no markdown noise — but still keep code in fenced blocks.

PRONUNCIATION:
When speaking aloud, pronounce "Spott.ca" as "Spot Dot See Ay". In text always write "Spott.ca".${extra ? `\n\nADMIN-DEFINED ADDITIONAL RULES:\n${extra.trim()}` : ""}`;
}

async function getAdminContext(request: Request): Promise<{
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
}> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { isAdmin: false };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { isAdmin: false };
  const sb = createClient(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.auth.getUser();
  if (!data.user) return { isAdmin: false };
  const { data: isAdmin } = await sb.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  return {
    isAdmin: !!isAdmin,
    userId: data.user.id,
    userEmail: data.user.email ?? undefined,
  };
}

export const Route = createFileRoute("/api/zeus/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Zeus is not configured", { status: 500 });

        const ctx = await getAdminContext(request);
        if (!ctx.isAdmin) return new Response("Zeus is admin-only", { status: 403 });

        const body = (await request.json()) as { messages: UIMessage[]; name?: string };
        const settings = await loadSparqSettings();
        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway(settings.model);
        const displayName = (body.name ?? "Zeus").slice(0, 40);

        try {
          const result = streamText({
            model,
            system: buildZeusPrompt(displayName, ctx.userEmail, settings.additional_instructions),
            temperature: Math.max(settings.temperature, 0.7),
            messages: await convertToModelMessages(body.messages),
          });
          return result.toUIMessageStreamResponse();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Zeus error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
