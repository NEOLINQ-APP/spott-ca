// pg_cron-driven worker: drains the crm_webhooks pgmq queue, signs each
// event with the connected business's own webhook_signing_secret (t=,v1=
// HMAC-SHA256, same scheme as stripe.server.ts's verifyWebhook — a
// separate signing convention from BARIO's own triggerWebhooks(), which
// doesn't use timestamps), and POSTs to BARIO's receiver. Mirrors
// src/routes/lovable/email/queue/process.ts's batch/retry/DLQ shape
// closely — same self-auth (pg_cron sends the service role key as a
// Bearer token), same MAX_RETRIES-then-DLQ posture. On DLQ, marks the
// originating business_leads row 'failed' — never a false "delivered".
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const MAX_RETRIES = 5;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_SEND_DELAY_MS = 200;
const BARIO_WEBHOOK_URL = process.env.BARIO_CRM_WEBHOOK_URL || "https://bario.ca/api/bario-one/spott/webhook";

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  message: {
    event_type: string;
    business_id: string;
    lead_id?: string;
    review_id?: string;
    queued_at?: string;
  };
};

async function signPayload(body: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const hex = Array.from(new Uint8Array(signed)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

async function buildEventData(supabase: SupabaseClient<any, any>, msg: QueueMessage): Promise<Record<string, unknown> | null> {
  const { event_type, business_id, lead_id, review_id } = msg.message;

  if (event_type === "lead.created" && lead_id) {
    const { data: lead } = await supabase.from("business_leads").select("*").eq("id", lead_id).maybeSingle();
    return lead ? { lead } : null;
  }
  if (event_type === "review.created" && review_id) {
    const { data: review } = await supabase.from("reviews").select("id, rating, body, owner_reply, owner_reply_at, created_at, user_id").eq("id", review_id).maybeSingle();
    return review ? { review } : null;
  }
  if (event_type === "listing.updated") {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, slug, name, description, phone, email, website, address, city, province, hero_image_url, hours, status")
      .eq("id", business_id)
      .maybeSingle();
    if (!biz) return null;
    return { listing: { ...biz, public_url: `https://www.spott.ca/business/${biz.slug}` } };
  }
  return null;
}

async function moveToDlq(
  supabase: SupabaseClient<any, any>,
  queue: string,
  msg: QueueMessage,
  reason: string,
): Promise<void> {
  await supabase.from("crm_webhook_send_log").insert({
    message_id: String(msg.msg_id),
    event_type: msg.message.event_type,
    business_id: msg.message.business_id,
    status: "dlq",
    error_message: reason.slice(0, 1000),
  });

  if (msg.message.event_type === "lead.created" && msg.message.lead_id) {
    await supabase.from("business_leads").update({ crm_sync_status: "failed" }).eq("id", msg.message.lead_id);
  }

  const { error } = await supabase.rpc("move_crm_webhook_to_dlq", {
    queue_name: queue,
    dlq_name: `${queue}_dlq`,
    msg_id: msg.msg_id,
    msg: msg.message,
  });
  if (error) console.error("Failed to move CRM webhook to DLQ", { queue, msg_id: msg.msg_id, reason, error });
}

export const Route = createFileRoute("/lovable/crm/webhook/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("Missing required environment variables");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Same x-cron-secret convention as ingest-tick.ts/saved-search-alerts.ts
        // (the only two routes this app's pg_cron actually calls today) —
        // not the service-role-Bearer shape the email queue worker uses,
        // which has no real cron registration to mirror.
        const cronSecret = request.headers.get("x-cron-secret");
        const expectedCronSecret = process.env.CRON_SECRET ?? "";
        if (!expectedCronSecret || cronSecret !== expectedCronSecret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey);
        const queue = "crm_webhooks";

        const { data: state } = await supabase.from("crm_webhook_send_state").select("batch_size, send_delay_ms, ttl_minutes").single();
        const batchSize = state?.batch_size ?? DEFAULT_BATCH_SIZE;
        const sendDelayMs = state?.send_delay_ms ?? DEFAULT_SEND_DELAY_MS;

        const { data: messages, error: readError } = await supabase.rpc("read_crm_webhook_batch", {
          queue_name: queue,
          batch_size: batchSize,
          vt_seconds: 30,
        });
        if (readError) {
          console.error("Failed to read CRM webhook batch", readError);
          return Response.json({ error: "read_failed" }, { status: 500 });
        }
        if (!messages?.length) return Response.json({ processed: 0 });

        let processed = 0;

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i] as QueueMessage;
          const { event_type, business_id } = msg.message;

          if (msg.read_ct >= MAX_RETRIES) {
            await moveToDlq(supabase, queue, msg, `Max retries (${MAX_RETRIES}) exceeded`);
            continue;
          }

          const { data: integration } = await supabase
            .from("crm_integrations")
            .select("external_org_id, webhook_signing_secret")
            .eq("business_id", business_id)
            .eq("status", "active")
            .maybeSingle();

          if (!integration) {
            // Business disconnected between enqueue and send — nothing to
            // deliver to. Not a failure; just drop.
            await supabase.rpc("delete_crm_webhook", { queue_name: queue, msg_id: msg.msg_id });
            continue;
          }

          const eventData = await buildEventData(supabase, msg);
          if (!eventData) {
            await moveToDlq(supabase, queue, msg, "Referenced record no longer exists");
            continue;
          }

          const eventId = `spott:${queue}:${msg.msg_id}`;
          const body = JSON.stringify({
            event_id: eventId,
            event_type,
            business_id,
            external_org_id: integration.external_org_id,
            data: eventData,
          });

          try {
            const signature = await signPayload(body, integration.webhook_signing_secret);
            const res = await fetch(BARIO_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-spott-signature": signature },
              body,
            });

            if (res.ok) {
              await supabase.from("crm_webhook_send_log").insert({
                message_id: String(msg.msg_id),
                event_type,
                business_id,
                status: "sent",
                response_status: res.status,
              });
              if (event_type === "lead.created" && msg.message.lead_id) {
                await supabase.from("business_leads").update({ crm_sync_status: "delivered", crm_synced_at: new Date().toISOString() }).eq("id", msg.message.lead_id);
              }
              await supabase.rpc("delete_crm_webhook", { queue_name: queue, msg_id: msg.msg_id });
              processed++;
            } else {
              const text = await res.text().catch(() => "");
              await supabase.from("crm_webhook_send_log").insert({
                message_id: String(msg.msg_id),
                event_type,
                business_id,
                status: "failed",
                response_status: res.status,
                error_message: text.slice(0, 1000),
              });
              // Message stays in queue; VT expires and it's retried next tick.
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            await supabase.from("crm_webhook_send_log").insert({
              message_id: String(msg.msg_id),
              event_type,
              business_id,
              status: "failed",
              error_message: errorMsg.slice(0, 1000),
            });
          }

          if (i < messages.length - 1) await new Promise((r) => setTimeout(r, sendDelayMs));
        }

        return Response.json({ processed });
      },
    },
  },
});
