import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { loadSparqSettings } from "@/lib/sparq-settings.server";


// Public chat endpoint for embedded Sparq widgets. CORS-open by design.
// Workspace identified by slug; system prompt built from workspace config.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/sparq/chat/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const supaUrl = process.env.SUPABASE_URL;
        const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supaUrl || !supaKey) {
          return new Response("Not configured", { status: 500, headers: CORS });
        }

        // Load workspace config via the SECURITY DEFINER helper (anon-safe).
        const cfgRes = await fetch(`${supaUrl}/rest/v1/rpc/get_sparq_widget_config`, {
          method: "POST",
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${supaKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ _slug: params.slug }),
        });
        if (!cfgRes.ok) return new Response("Workspace lookup failed", { status: 500, headers: CORS });
        const cfgArr = await cfgRes.json();
        const cfg = Array.isArray(cfgArr) ? cfgArr[0] : null;
        if (!cfg) return new Response("Workspace not found", { status: 404, headers: CORS });

        // Load full row for knowledge_base via service role (RPC kept lean).
        const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        let knowledge = "";
        let active = true;
        if (svcKey) {
          const full = await fetch(`${supaUrl}/rest/v1/sparq_workspaces?id=eq.${cfg.id}&select=knowledge_base,status,messages_this_month,monthly_message_limit`, {
            headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` },
          });
          const rows = await full.json();
          if (Array.isArray(rows) && rows[0]) {
            knowledge = rows[0].knowledge_base ?? "";
            active = rows[0].status !== "canceled";
            if (rows[0].messages_this_month >= rows[0].monthly_message_limit) active = false;
          }
        }
        if (!active) {
          return new Response("This Sparq is paused. The owner needs to upgrade or renew.", { status: 402, headers: CORS });
        }

        const { messages }: { messages: UIMessage[] } = await request.json();

        const system = `You are ${cfg.assistant_name}, the professional AI assistant for ${cfg.business_name}. You exist solely to represent and assist ${cfg.business_name} and its customers.

SCOPE — STRICT:
You ONLY discuss ${cfg.business_name}: its products, services, pricing, hours, location, policies, bookings, orders, and related customer-service questions. Help the customer transact with the business — answer their question, point them to the right product/service, book them in, take their contact info, or hand them off to the team.

OUT OF SCOPE — politely decline:
- Personal feelings, emotional support, mental health, relationships, companionship
- Personal life goals, advice unrelated to the business, venting
- General knowledge, news, politics, religion, homework, coding, medical/legal/financial advice
- Competitors, other businesses, or anything not about ${cfg.business_name}
If a visitor goes off-topic, respond in ONE short professional sentence and redirect: "I'm here to help with ${cfg.business_name} — is there something about our [products/services/booking] I can help you with?" Do not engage with off-topic content even if pressed.

TONE:
Professional, courteous, efficient. You are a business representative, not a friend or companion. Keep replies tight (1–4 sentences unless detail is requested). Always move the conversation toward a customer outcome: an answer, a quote, a booking, a sale, a follow-up contact. If you don't know an answer, offer to take the visitor's name and email/phone so the ${cfg.business_name} team can follow up.
${knowledge ? `\n--- BUSINESS KNOWLEDGE ---\n${knowledge}\n--- END KNOWLEDGE ---\n` : ""}
Powered by Sparq on Spott.ca.`;

        const gateway = createLovableAiGatewayProvider(apiKey);
        try {
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system,
            messages: await convertToModelMessages(messages),
          });

          // Fire-and-forget usage increment.
          if (svcKey) {
            fetch(`${supaUrl}/rest/v1/rpc/increment_sparq_usage`, {
              method: "POST",
              headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ _id: cfg.id }),
            }).catch(() => {});
          }

          const res = result.toUIMessageStreamResponse();
          // Add CORS headers to the streaming response.
          const headers = new Headers(res.headers);
          for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
          return new Response(res.body, { status: res.status, headers });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Sparq error";
          return new Response(msg, { status: 500, headers: CORS });
        }
      },
    },
  },
});
