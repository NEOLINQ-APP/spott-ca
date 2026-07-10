// Sparq text-only chat endpoint with trial gating.
// - Free users: TEXT_FREE_LIMIT text turns / calendar month
// - Paid subscribers (Pro/Business): unlimited text
// - Image generation is on a separate endpoint (sparq.image) — gated to paid
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { errorResponse, isResponse, jsonResponse, readJsonBody, requireBearerAuth } from "@/lib/api/http.server";
import { loadSparqSettings } from "@/lib/sparq-settings.server";

const TEXT_FREE_LIMIT = 15;

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Body = { messages: Msg[] };

const SYSTEM_BASE = `You are Sparq, the AI assistant for Spott.ca (a Canadian local-business directory + marketplace + vehicle listings platform).

MISSION
- Help users navigate Spott.ca: finding businesses in the directory, browsing marketplace/vehicle listings, and creating their own listings.
- Assist with writing listing titles/descriptions, choosing categories, and general support questions about how Spott.ca works.

HARD LIMITS
- Only discuss Spott.ca and the businesses/listings on it. Politely redirect off-topic personal/emotional/general-life questions back to Spott.
- Never edit user data, subscriptions, billing, or business profiles directly. If asked, point them to the right page (e.g. /business/billing, /dashboard, /pricing).
- Never generate images in text replies. If the user asks for an image, tell them to use the "Generate image" button in the Sparq panel (image generation is a Pro feature).
- Pronounce and write the brand as "Spott.ca" (in speech contexts, "Spot dot see ay").

STYLE
- Warm, concise, helpful. Short paragraphs. Use markdown lists when useful.`;

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

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return errorResponse(500, "AI not configured");
        const gateway = createLovableAiGatewayProvider(key);

        const system = [SYSTEM_BASE, settings.additional_instructions ?? ""].filter(Boolean).join("\n\n");
        const modelId = settings.model || "google/gemini-2.5-flash";

        try {
          const { text } = await generateText({
            model: gateway(modelId),
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

          return jsonResponse({
            reply: text,
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
