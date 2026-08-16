// Sparq text-only chat endpoint with trial gating.
// - Free users: TEXT_FREE_LIMIT text turns / calendar month
// - Paid subscribers (Pro/Business): unlimited text
// - Image generation is on a separate endpoint (sparq.image) — gated to paid
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { resolveAiModel } from "@/lib/ai-gateway";
import { errorResponse, isResponse, jsonResponse, readJsonBody, requireBearerAuth } from "@/lib/api/http.server";
import { loadSparqSettings } from "@/lib/sparq-settings.server";

const TEXT_FREE_LIMIT = 15;

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Body = { messages: Msg[]; conversationId?: string };

const SYSTEM_BASE = `You are Sparq, the AI assistant for Spott.ca — a Canadian all-in-one local commerce platform that merges a Yelp-style business directory, a Kijiji/Marketplace-style classifieds section, and an AutoTrader-style vehicle hub.

MISSION
- Help users navigate Spott.ca: finding businesses in the directory (/browse, /directory, /city/$slug), browsing marketplace listings (/marketplace) across its 16 categories, and browsing the vehicle hub (/vehicles).
- Assist with writing listing titles/descriptions, choosing categories, and pricing tone for their own posts.
- Explain trust signals when relevant: Verified Business, Verified Dealer, Verified Realtor, Trusted Seller and Premium Member badges, and what Featured placement means for a business.
- Point users to /claim/$slug to claim an existing business, or /business/new and /business-signup to create one.

MARKETPLACE SAFETY
- When a user is arranging to meet a buyer/seller or asks about safety, proactively suggest: meet in a public place, bring a friend if possible, inspect the item before paying, and never wire money or pay outside Spott.ca's tracked flow for an item they haven't seen. Keep it brief — one or two lines, not a lecture.

HARD LIMITS
- Only discuss Spott.ca and the businesses/listings on it. Off-topic personal/emotional/general-life questions get a short, warm redirect back to Spott — see OFF_TOPIC_REPLY below for the exact line to use.
- Never edit user data, subscriptions, billing, or business profiles directly. If asked, point them to the right page (e.g. /business/billing, /dashboard, /pricing).
- Never generate images in text replies. If the user asks for an image, tell them to use the "Generate image" button in the Sparq panel (image generation is a Pro feature).
- Pronounce and write the brand as "Spott.ca" (in speech contexts, "Spot dot see ay").

STYLE
- Warm, concise, helpful. Short paragraphs. Use markdown lists when useful.`;

function buildSystemPrompt(settings: Awaited<ReturnType<typeof loadSparqSettings>>): string {
  const base = settings.system_prompt_override?.trim() || SYSTEM_BASE;
  const parts = [base];

  if (settings.business_strict_mode) {
    parts.push(
      "STRICT MODE\n- Do not answer anything unrelated to Spott.ca, even if the user insists or rephrases. No general trivia, coding help, homework, or personal advice — redirect every time, no exceptions.",
    );
  }

  if (settings.offtopic_redirect?.trim()) {
    parts.push(
      `OFF_TOPIC_REPLY\n- When redirecting an off-topic question, use this line (light rephrasing for context is fine, keep the meaning): "${settings.offtopic_redirect.trim()}"`,
    );
  }

  if (settings.business_additional_rules?.trim()) {
    parts.push(`ADDITIONAL RULES (admin-configured)\n${settings.business_additional_rules.trim()}`);
  }

  if (settings.additional_instructions?.trim()) {
    parts.push(settings.additional_instructions.trim());
  }

  return parts.join("\n\n");
}

// Best-effort transcript logging for the admin "Sparq Learning" dashboard.
// Never throws — a logging failure must not break the user-facing chat reply.
async function logTurn(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  opts: {
    userId: string;
    userEmail: string | null;
    conversationId: string | undefined;
    userMessage: string;
    assistantMessage: string;
  },
): Promise<string | undefined> {
  try {
    let conversationId = opts.conversationId;

    if (conversationId) {
      const { data: owned } = await supabaseAdmin
        .from("haiku_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", opts.userId)
        .maybeSingle();
      if (!owned) conversationId = undefined;
    }

    let priorCount = 0;
    if (!conversationId) {
      const { data: created } = await supabaseAdmin
        .from("haiku_conversations")
        .insert({
          user_id: opts.userId,
          user_email: opts.userEmail,
          mode: "text",
          title: opts.userMessage.slice(0, 80),
        })
        .select("id")
        .single();
      conversationId = created?.id;
    } else {
      const { data: existing } = await supabaseAdmin
        .from("haiku_conversations")
        .select("message_count")
        .eq("id", conversationId)
        .maybeSingle();
      priorCount = existing?.message_count ?? 0;
    }
    if (!conversationId) return undefined;

    await supabaseAdmin.from("haiku_messages").insert([
      { conversation_id: conversationId, user_id: opts.userId, role: "user", parts: { text: opts.userMessage } },
      { conversation_id: conversationId, user_id: opts.userId, role: "assistant", parts: { text: opts.assistantMessage } },
    ] as never);

    await supabaseAdmin
      .from("haiku_conversations")
      .update({
        message_count: priorCount + 2,
        last_message_at: new Date().toISOString(),
      } as never)
      .eq("id", conversationId);

    return conversationId;
  } catch {
    return opts.conversationId;
  }
}

export const Route = createFileRoute("/api/sparq/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<Body>(request);
        if (isResponse(body)) return body;
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return errorResponse(400, "messages required");
        }

        const settings = await loadSparqSettings();
        if (!settings.enabled) return errorResponse(503, "Sparq is temporarily disabled.");

        // Check subscription (Pro/Business bypass the trial limit)
        const { data: isPaid } = await auth.supabase.rpc("has_active_subscription", {
          user_uuid: auth.userId,
          check_env: "live",
        });

        // Trial gating via haiku_usage (feature='sparq_text', monthly window)
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let used = 0;
        let limit = TEXT_FREE_LIMIT;
        if (!isPaid) {
          const { data: usage } = await supabaseAdmin
            .from("haiku_usage")
            .select("used_count, free_limit, period_start")
            .eq("user_id", auth.userId)
            .eq("feature", "sparq_text")
            .maybeSingle();

          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const periodOld = usage && new Date(usage.period_start) < monthStart;
          used = !usage || periodOld ? 0 : usage.used_count;
          limit = usage?.free_limit ?? TEXT_FREE_LIMIT;

          if (used >= limit) {
            return jsonResponse(
              {
                error: {
                  code: "trial_exhausted",
                  message: `You've used all ${limit} free Sparq messages this month. Upgrade to Pro for unlimited chat.`,
                },
                usage: { used, limit, paid: false },
              },
              { status: 402 },
            );
          }
        }

        const system = buildSystemPrompt(settings);
        const modelId = settings.model || "google/gemini-2.5-flash";

        try {
          const { text } = await generateText({
            model: resolveAiModel(modelId),
            system,
            messages: body.messages
              .filter((m) => m.role !== "system")
              .slice(-20)
              .map((m) => ({ role: m.role, content: m.content })) as never,
            temperature: settings.temperature ?? 0.7,
          });

          // Increment usage for free users
          if (!isPaid) {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            await supabaseAdmin.from("haiku_usage").upsert(
              {
                user_id: auth.userId,
                feature: "sparq_text",
                used_count: used + 1,
                free_limit: limit,
                period_start: used === 0 ? monthStart : undefined,
                updated_at: new Date().toISOString(),
              } as never,
              { onConflict: "user_id,feature" },
            );
          }

          const lastUserMessage = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
          const { data: userData } = await auth.supabase.auth.getUser();
          const conversationId = await logTurn(supabaseAdmin, {
            userId: auth.userId,
            userEmail: userData.user?.email ?? null,
            conversationId: body.conversationId,
            userMessage: lastUserMessage,
            assistantMessage: text,
          });

          return jsonResponse({
            reply: text,
            conversationId,
            usage: { used: isPaid ? 0 : used + 1, limit, paid: !!isPaid },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI request failed";
          return errorResponse(502, msg);
        }
      },
    },
  },
});
