// Zeus Social Media Automator — admin-only endpoint.
// Generates on-brand social posts (IG/TikTok, LinkedIn, X) + CTA for a
// listing, category, or update, using the Lovable AI gateway.
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
  kind?: "listing" | "category" | "update" | "auto";
};

const SYSTEM = `You are the Social Media Manager for Spott.ca — a Canadian all-in-one local commerce super-app (business directory + marketplace + vehicles).

BRAND VOICE
- Dark-first, warm-red aesthetic. Professional, community-focused, unmistakably Canadian (spell "neighbourhood", "centre", use CAD).
- Confident, warm, never cringe. No stock-marketing filler ("Unlock the power of…"). No emojis spam — 1-2 tasteful max per post.
- Always spell the brand as "Spott.ca" (never "Spot" or "spott").

OUTPUT FORMAT (STRICT — return valid Markdown, exactly these 4 sections in this order):

## Instagram / TikTok
**Hook (first 2 sec):** <one line>
**30-sec script / visual:** <3-5 shot beats, each on its own line>
**Caption:** <caption text with 4-6 hashtags>

## LinkedIn
<A 90-140 word "Marketplace Insights" post explaining why this item/business/trend is moving in Canada right now. Include one concrete stat or observation. Professional tone.>

## X (Twitter)
<A single post, MAX 280 characters including hashtags and link. Punchy, one clear hook. 2-3 hashtags.>

## Call to Action
<One line that leads back to Spott.ca with a specific reason to click. Example: "Find more deals like this on Spott.ca →">

RULES
- Never invent prices, mileage, or specs not given. If a detail is missing, keep the post general.
- End every platform with a natural nudge to Spott.ca.
- Never mention competitors by name.
- Never open a hook with "Looking for…", "Introducing…", or "Attention…" — lead with a concrete detail instead.`;

export const Route = createFileRoute("/api/zeus/social")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;

        // Admin-only
        const { data: roles } = await auth.supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", auth.userId);
        const isAdmin = (roles ?? []).some((r) => r.role === "admin");
        if (!isAdmin) return errorResponse(403, "Admin only");

        const body = await readJsonBody<Body>(request);
        if (isResponse(body)) return body;
        const input = (body.input ?? "").trim();
        if (!input) return errorResponse(400, "input required");
        if (input.length > 4000) return errorResponse(400, "input too long");

        const userPrompt = `Generate social posts for the following ${body.kind ?? "item"}:

${input}

Remember: dark-first, warm-red, Canadian, professional, community-focused. All four sections. End every post pointing back to Spott.ca.`;

        try {
          const { text } = await generateText({
            model: resolveAiModel("google/gemini-3-flash-preview"),
            system: SYSTEM,
            messages: [{ role: "user", content: userPrompt }] as never,
            temperature: 0.8,
          });
          return jsonResponse({ content: text });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "AI request failed";
          return errorResponse(502, msg);
        }
      },
    },
  },
});
