// pg_cron-driven worker: drains the acquisition_events pgmq queue and
// POSTs each event to Bario One's internal Spott Acquisition endpoint.
// Same x-cron-secret self-auth as the crm webhook worker, same
// retry-then-DLQ shape, simpler signing (a single shared partner secret
// header rather than a per-business HMAC, since every event goes to one
// fixed internal org, not a customer-controlled destination).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

const MAX_RETRIES = 5;
const BARIO_BASE = process.env.BARIO_BASE_URL || "https://www.bario.ca";

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: { event_type: string; business_id: string; data: Record<string, unknown> };
};

async function moveToDlq(supabase: SupabaseClient<any, any>, msg: QueueMessage, reason: string) {
  await supabase.from("acquisition_event_log").insert({
    message_id: String(msg.msg_id),
    event_type: msg.message.event_type,
    business_id: msg.message.business_id,
    status: "dlq",
    error_message: reason.slice(0, 1000),
  });
  await supabase.rpc("move_acquisition_event_to_dlq", {
    queue_name: "acquisition_events",
    dlq_name: "acquisition_events_dlq",
    msg_id: msg.msg_id,
    msg: msg.message,
  });
}

export const Route = createFileRoute("/lovable/acquisition/webhook/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const partnerSecret = process.env.CRM_PARTNER_SECRET;
        if (!supabaseUrl || !supabaseServiceKey || !partnerSecret) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const cronSecret = request.headers.get("x-cron-secret");
        if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey);
        const { data: messages } = await supabase.rpc("read_acquisition_event_batch", {
          queue_name: "acquisition_events",
          batch_size: 10,
          vt_seconds: 30,
        });
        if (!messages?.length) return Response.json({ processed: 0 });

        let processed = 0;
        for (const msg of messages as QueueMessage[]) {
          if (msg.read_ct >= MAX_RETRIES) {
            await moveToDlq(supabase, msg, `Max retries (${MAX_RETRIES}) exceeded`);
            continue;
          }
          try {
            const res = await fetch(`${BARIO_BASE}/api/internal/spott-acquisition/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-bario-partner-secret": partnerSecret },
              body: JSON.stringify(msg.message),
            });
            if (res.ok) {
              await supabase.from("acquisition_event_log").insert({
                message_id: String(msg.msg_id), event_type: msg.message.event_type, business_id: msg.message.business_id,
                status: "sent", response_status: res.status,
              });
              await supabase.rpc("delete_acquisition_event", { queue_name: "acquisition_events", msg_id: msg.msg_id });
              processed++;
            } else {
              const text = await res.text().catch(() => "");
              await supabase.from("acquisition_event_log").insert({
                message_id: String(msg.msg_id), event_type: msg.message.event_type, business_id: msg.message.business_id,
                status: "failed", response_status: res.status, error_message: text.slice(0, 1000),
              });
            }
          } catch (e) {
            await supabase.from("acquisition_event_log").insert({
              message_id: String(msg.msg_id), event_type: msg.message.event_type, business_id: msg.message.business_id,
              status: "failed", error_message: (e as Error).message.slice(0, 1000),
            });
          }
        }
        return Response.json({ processed });
      },
    },
  },
});
