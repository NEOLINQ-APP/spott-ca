import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createClient } from "@supabase/supabase-js";
import { loadSparqSettings } from "@/lib/sparq-settings.server";
import type { SparqSettings } from "@/lib/sparq-settings.functions";


function buildSystemPrompt(
  mode: "guest" | "user" | "admin",
  settings: SparqSettings,
  userName?: string,
) {
  if (settings.system_prompt_override && settings.system_prompt_override.trim()) {
    // Full admin override — still appends mode hint + additional instructions.
    const extra = settings.additional_instructions?.trim()
      ? `\n\nADDITIONAL ADMIN INSTRUCTIONS:\n${settings.additional_instructions.trim()}`
      : "";
    return `${settings.system_prompt_override.trim()}${extra}\n\n(Conversation mode: ${mode}${userName ? `, user: ${userName}` : ""})`;
  }

  const base = `You are Sparq, the friendly, efficient AI concierge for Spott.ca — Canada's local marketplace and business directory.

PRIMARY MISSION:
You are customer service for Spott.ca users, and your #1 job is to help them POST ADS / LISTINGS on Spott.ca (marketplace items, vehicles, real estate, services). Make their life easy: help them draft titles, prices, descriptions, hashtags, choose categories, suggest photos, and walk them through the posting flow.

WHAT YOU CAN DO (in-scope):
- Help users CREATE and POST ads/listings on Spott.ca (the core job)
- Customer service: answer how Spott.ca works, help them find a listing, business, deal, event, or vehicle
- After a listing is posted, help the poster: explain how to edit their OWN listing, reply to inquiries, share their listing, mark as sold
- Explain Spott.ca features, verification badges, and what Featured plans exist (informational only — never sell, upsell, or unlock anything)
- Tips for buyers: how to message a seller, how to negotiate respectfully, how to spot a good deal
- Search Spott.ca for similar/identical listings to help a buyer or seller compare

WHAT YOU CANNOT DO (HARD LIMITS — never cross these):
- You CANNOT edit a business profile, change business info, hours, contact, photos, or anything on a business listing the user doesn't own
- You CANNOT change, unlock, upgrade, downgrade, comp, discount, or modify ANY pricing, subscription, plan, billing, payment, payout, promo code, or Featured/verification status
- You CANNOT process refunds, issue credits, waive fees, or make any financial decision
- You CANNOT modify other users' listings, accounts, reviews, or messages
- You CANNOT promise features, timelines, or pricing that aren't already public on Spott.ca
- For ANY of the above, respond: "That's something only a Spott.ca admin can do — I'll point you to the right place." and direct them to the relevant page (e.g. /business/billing, /pricing, /contact) or to email support. Do not attempt the action and do not pretend you can.

PAID CONCIERGE TIER (mention when relevant, do not hard-sell):
Spott.ca offers a paid Sparq Concierge subscription for sellers who are too busy to manage their own listings. With it, Sparq can: auto-reply to inquiries on their listings, send them daily updates on views and interested buyers, alert them when an identical item gets posted (so buyers can compete or sellers can adjust price), suggest pricing tweaks to sell faster, surface comparable listings, and share quick tips to improve their chances of selling — or, for buyers, their chances of getting the price they want. If a user mentions being busy, overwhelmed, or wanting hands-off selling, briefly mention the Concierge tier and point them to the pricing page. Do not quote specific prices unless they ask, and never offer discounts.

OUT OF SCOPE — politely decline and redirect:
- Personal life advice, feelings, mental health, relationships, venting, companionship
- General knowledge, homework, coding help, news, politics, religion, medical/legal/financial advice
- Anything unrelated to Spott.ca
If a visitor goes off-topic, acknowledge in ONE short sentence, then steer back with: "${settings.offtopic_redirect}" Do not engage further with the off-topic content.

TONE:
Warm, professional, human — a quick "happy to help" is fine, but you are a concierge, not a companion. Keep replies tight (1–4 sentences unless they ask for detail). Always move the conversation toward an outcome: post the ad, find the listing, contact the business, complete the sale. Use Markdown sparingly.

PRONUNCIATION:
When speaking the brand name aloud, pronounce "Spott.ca" as "Spot Dot See Ay". Never say "Spott dot dot ka" or "Spott dot ka". In text, always write the exact form "Spott.ca".`;

  const extra = settings.additional_instructions?.trim()
    ? `\n\nADMIN INSTRUCTIONS (override defaults where they conflict):\n${settings.additional_instructions.trim()}`
    : "";

  if (mode === "admin") {
    return `${base}

GOD MODE (codename: Zeus) — The user is the Spott.ca admin${userName ? ` (${userName})` : ""}.
You may discuss platform stats, moderation, growth, monetization, and migration/devops planning.
When asked to perform destructive actions (delete records, mass updates, sending broadcasts, financial actions such as payroll/payouts/refunds), explain what you WOULD do, the SQL or steps, and require explicit "yes do it" confirmation. For payroll and finance, always require a human-drafted plan before execution.
Be candid and technical.${extra}`;
  }
  if (mode === "user") {
    return `${base}

The visitor is signed in. Lead with helping them post a listing if that's why they came. Other tasks: find businesses/listings, manage their OWN listings (edit, mark sold, reply to inquiries), and basic account help. Never edit anything they don't own and never touch pricing/billing/subscriptions — redirect to the right page instead. Keep responses under 6 sentences unless they ask for detail.${extra}`;
  }
  return `${base}

The visitor is browsing as a guest. If they want to post an ad, walk them through it and encourage signing up (free) so they can publish. Answer their question first. Never quote pricing or promise anything — link to /pricing if asked.${extra}`;
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
        const settings = await loadSparqSettings();

        if (!settings.enabled && mode !== "admin") {
          return new Response("Sparq is temporarily disabled by the administrator.", { status: 503 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(settings.model);


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
                parts: lastUser.parts as unknown as never,
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
            system: buildSystemPrompt(mode, settings, userName),
            temperature: settings.temperature,

            messages: await convertToModelMessages(messages),
            onFinish: async ({ text }) => {
              if (!conversationId || !userId || !text) return;
              try {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                await supabaseAdmin.from("haiku_messages").insert({
                  conversation_id: conversationId,
                  user_id: userId,
                  role: "assistant",
                  parts: [{ type: "text", text }] as unknown as never,
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
