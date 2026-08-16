// Sparq Social Media Kit — paid-only endpoint for business owners.
// Generates on-brand social posts (IG/TikTok, LinkedIn, X) + CTA for their
// own listing / business. Gated to active Pro/Business subscribers.
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { resolveAiModel } from "@/lib/ai-gateway";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

type Body = {
  input: string;
  kind?: "listing" | "business" | "update" | "auto";
};

const SYSTEM = `You are Sparq, the social-media co-pilot for a Spott.ca business owner. You generate on-brand posts they can publish to grow their own listing/business, always driving traffic back to their page on Spott.ca.

BRAND VOICE
- Dark-first, warm-red aesthetic. Professional, community-focused, unmistakably Canadian (spell "neighbourhood", "centre", CAD).
- Confident, warm, never cringe. No stock-marketing filler. 1-2 tasteful emojis max per post.
- Always spell the brand "Spott.ca". Never mention competitors.

OUTPUT FORMAT (STRICT — valid Markdown, exactly these 4 sections in this order):

## Instagram / TikTok
**Hook (first 2 sec):** <one line>
**30-sec script / visual:** <3-5 shot beats, each on its own line>
**Caption:** <caption text with 4-6 hashtags>

## LinkedIn
<90-140 word professional post positioning the business/listing in its Canadian market. One concrete detail or observation.>

## X (Twitter)
<Single post, MAX 280 characters. Punchy hook, 2-3 hashtags.>

## Call to Action
<One line pointing back to their listing on Spott.ca. Example: "See it live on Spott.ca →">

RULES
- Never invent prices, specs, or facts not given.
- Every platform ends with a natural nudge to Spott.ca.
- Do not offer to edit their listing, billing, or account.
- Never open a hook with "Looking for…", "Introducing…", or "Attention…" — lead with a concrete detail instead.`;

export const Route = createFileRoute("/api/sparq/social")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;

        // Paid-only. RPC returns boolean.
        const { data: isPaid, error: subErr } = await auth.supabase.rpc(
          "has_active_subscription",
          { user_uuid: auth.userId, check_env: "live" },
        );
        if (subErr) return errorResponse(500, "Subscription check failed");
        if (!isPaid) {
          return jsonResponse(
            {
              error: {
                code: "subscription_required",
                message: "The Social Media Kit is a Pro feature. Upgrade to unlock.",
              },
            },
            { status: 402 },
          );
        }

        const body = await readJsonBody<Body>(request);
        if (isResponse(body)) return body;
        const input = (body.input ?? "").trim();
        if (!input) return errorResponse(400, "input required");
        if (input.length > 4000) return errorResponse(400, "input too long");

        const userPrompt = `Generate social posts for this ${body.kind ?? "item"}:

${input}

Remember: dark-first, warm-red, Canadian, professional. All four sections. End every post pointing back to Spott.ca.`;

        try {
          const { text } = await generateText({
            model: resolveAiModel("google/gemini-2.5-flash"),
            system: SYSTEM,
            messages: [{ role: "user", content: userPrompt }] as never,
            temperature: 0.8,
          });

          // Track usage (analytics only — no hard cap for paid users)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const { data: existing } = await supabaseAdmin
            .from("haiku_usage")
            .select("used_count, period_start")
            .eq("user_id", auth.userId)
            .eq("feature", "sparq_social")
            .maybeSingle();
          const periodOld = existing && new Date(existing.period_start) < new Date(monthStart);
          const nextCount = !existing || periodOld ? 1 : existing.used_count + 1;
          await supabaseAdmin.from("haiku_usage").upsert(
            {
              user_id: auth.userId,
              feature: "sparq_social",
              used_count: nextCount,
              free_limit: 9999,
              period_start: !existing || periodOld ? monthStart : undefined,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: "user_id,feature" },
          );

          return jsonResponse({ content: text, used_this_month: nextCount });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI request failed";
          return errorResponse(502, msg);
        }
      },
    },
  },
});
