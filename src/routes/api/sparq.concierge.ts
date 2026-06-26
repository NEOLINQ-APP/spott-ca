import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

type Fields = {
  business_name?: string;
  assistant_name?: string;
  website_url?: string;
  brand_color?: string;
  greeting?: string;
  knowledge_base?: string;
};

type ConciergePayload = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  fields: Fields;
};

const SYSTEM = `You are Sparq, an AI onboarding concierge for Spott.ca's "Sparq for Business" product.
You are walking a business owner through setting up their own Sparq AI assistant for their website.
Be warm, fast, and conversational — one short question at a time. Never dump a long form.

Collect, in roughly this order:
1. business_name — the official name
2. website_url — their website (optional, but ask)
3. assistant_name — what they want to call their assistant (default "Sparq", suggest something on-brand)
4. brand_color — a hex color (e.g. "#3B82F6"). If they describe a color in words, convert to a reasonable hex.
5. greeting — the first message visitors see (offer to write one based on their business)
6. knowledge_base — FAQs, hours, services, pricing, policies. Ask them to paste anything useful, or offer to draft a starter from what they've told you so far.

Rules:
- ALWAYS respond with a single JSON object — no markdown, no code fences, no prose outside JSON.
- Schema: {"reply": string, "fields": {...partial Fields to merge...}, "complete": boolean}
- "reply" is the next short message to the user (1–3 sentences, friendly).
- "fields" contains ONLY fields you learned this turn. Omit fields you didn't get.
- Set "complete": true ONLY after business_name AND greeting are confirmed and the user has either provided knowledge_base or explicitly skipped it.
- When complete is true, "reply" should be a short celebration like "Perfect — creating your Sparq workspace now…".
- If the user goes off-topic, gently steer back.
- If a value is obviously wrong (e.g. brand_color isn't a hex), normalize it in fields.`;

export const Route = createFileRoute("/api/sparq/concierge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Sparq concierge not configured", { status: 500 });

        let payload: ConciergePayload;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const fieldsLine = `CURRENT_FIELDS_COLLECTED: ${JSON.stringify(payload.fields ?? {})}`;
        const history = (payload.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        try {
          const { text } = await generateText({
            model,
            system: `${SYSTEM}\n\n${fieldsLine}`,
            messages: history,
          });

          // Extract JSON (model may occasionally wrap in code fences)
          let jsonText = text.trim();
          const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (fenced) jsonText = fenced[1].trim();
          const firstBrace = jsonText.indexOf("{");
          const lastBrace = jsonText.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonText = jsonText.slice(firstBrace, lastBrace + 1);
          }

          let parsed: { reply?: string; fields?: Fields; complete?: boolean };
          try {
            parsed = JSON.parse(jsonText);
          } catch {
            // Fallback: treat raw text as reply
            parsed = { reply: text, fields: {}, complete: false };
          }

          return Response.json({
            reply: parsed.reply ?? "",
            fields: parsed.fields ?? {},
            complete: Boolean(parsed.complete),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Sparq concierge error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
