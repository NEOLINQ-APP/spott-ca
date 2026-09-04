// pg_cron-driven worker: drains the bario_lead_sync pgmq queue and POSTs
// signed financing-lead events to Bario One's real receiver. Mirrors
// src/routes/lovable/crm/webhook/process.ts's batch/sign/retry/DLQ shape
// closely (same proven production pattern already handling
// business_leads -> Bario CRM) — the one real difference is there's no
// per-business crm_integrations lookup: Spott Auto is a single,
// company-wide connection into Bario's own CRM, signed with one shared
// secret (BARIO_ONE_SYNC_SECRET), not a per-tenant webhook_signing_secret.
// On DLQ, marks bario_sync_records 'failed' — never a false "synced".
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
    application_id: string;
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

async function buildEventData(supabase: SupabaseClient<any, any>, applicationId: string): Promise<Record<string, unknown> | null> {
  const { data: application } = await supabase
    .from("financing_applications")
    .select(
      "id, application_code, full_name, email, phone, city, province, status, lead_source, utm_source, utm_medium, utm_campaign, dealer_business_id, vehicle_id, created_at, partner_id, spott_auto_partners(referral_code)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return null;

  const [{ data: vehicleInterest }, { data: financingDetails }] = await Promise.all([
    supabase.from("vehicle_interest").select("*").eq("application_id", applicationId).maybeSingle(),
    supabase.from("financing_application_details").select("*").eq("application_id", applicationId).maybeSingle(),
  ]);

  return {
    lead: {
      application_code: application.application_code,
      full_name: application.full_name,
      email: application.email,
      phone: application.phone,
      city: application.city,
      province: application.province,
      status: application.status,
      lead_source: application.lead_source,
      utm_source: application.utm_source,
      utm_medium: application.utm_medium,
      utm_campaign: application.utm_campaign,
      dealer_business_id: application.dealer_business_id,
      vehicle_id: application.vehicle_id,
      partner_referral_code: (application as any).spott_auto_partners?.referral_code ?? null,
      created_at: application.created_at,
      vehicle_interest: vehicleInterest ?? null,
      financing_details: financingDetails ?? null,
    },
  };
}

async function recordActivity(supabase: SupabaseClient<any, any>, applicationId: string, description: string) {
  await supabase.from("lead_activities").insert({
    application_id: applicationId,
    activity_type: "bario_sync",
    description,
    is_internal: false,
  });
}

async function moveToDlq(supabase: SupabaseClient<any, any>, queue: string, msg: QueueMessage, reason: string): Promise<void> {
  const applicationId = msg.message.application_id;
  await supabase.from("bario_lead_sync_log").insert({
    message_id: String(msg.msg_id),
    event_type: msg.message.event_type,
    application_id: applicationId,
    status: "dlq",
    error_message: reason.slice(0, 1000),
  });

  await supabase
    .from("bario_sync_records")
    .update({ status: "failed", last_error: reason.slice(0, 1000), updated_at: new Date().toISOString() })
    .eq("application_id", applicationId);
  await recordActivity(supabase, applicationId, "Bario One synchronization failed after repeated retries");

  const { error } = await supabase.rpc("move_bario_lead_sync_to_dlq", {
    queue_name: queue,
    dlq_name: `${queue}_dlq`,
    msg_id: msg.msg_id,
    msg: msg.message,
  });
  if (error) console.error("Failed to move Bario lead sync to DLQ", { queue, msg_id: msg.msg_id, reason, error });
}

export const Route = createFileRoute("/lovable/bario/lead-sync/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const syncSecret = process.env.BARIO_ONE_SYNC_SECRET;
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error("Missing required environment variables");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const cronSecret = request.headers.get("x-cron-secret");
        const expectedCronSecret = process.env.CRON_SECRET ?? "";
        if (!expectedCronSecret || cronSecret !== expectedCronSecret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!syncSecret) {
          console.error("BARIO_ONE_SYNC_SECRET is not configured — cannot sign outbound lead payloads");
          return Response.json({ error: "sync_not_configured" }, { status: 500 });
        }

        const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey);
        const queue = "bario_lead_sync";

        const { data: state } = await supabase.from("bario_lead_sync_state").select("batch_size, send_delay_ms").single();
        const batchSize = state?.batch_size ?? DEFAULT_BATCH_SIZE;
        const sendDelayMs = state?.send_delay_ms ?? DEFAULT_SEND_DELAY_MS;

        const { data: messages, error: readError } = await supabase.rpc("read_bario_lead_sync_batch", {
          queue_name: queue,
          batch_size: batchSize,
          vt_seconds: 30,
        });
        if (readError) {
          console.error("Failed to read Bario lead sync batch", readError);
          return Response.json({ error: "read_failed" }, { status: 500 });
        }
        if (!messages?.length) return Response.json({ processed: 0 });

        let processed = 0;

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i] as QueueMessage;
          const { event_type, application_id } = msg.message;

          if (msg.read_ct >= MAX_RETRIES) {
            await moveToDlq(supabase, queue, msg, `Max retries (${MAX_RETRIES}) exceeded`);
            continue;
          }

          const eventData = await buildEventData(supabase, application_id);
          if (!eventData) {
            await moveToDlq(supabase, queue, msg, "Referenced application no longer exists");
            continue;
          }

          await supabase
            .from("bario_sync_records")
            .update({ status: msg.read_ct > 0 ? "retrying" : "syncing", last_attempt_at: new Date().toISOString(), retry_count: msg.read_ct })
            .eq("application_id", application_id);

          const eventId = `spott:${queue}:${msg.msg_id}`;
          const body = JSON.stringify({ event_id: eventId, event_type, application_id, data: eventData });

          try {
            const signature = await signPayload(body, syncSecret);
            const res = await fetch(BARIO_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-spott-signature": signature },
              body,
            });

            if (res.ok) {
              const resBody = await res.json().catch(() => ({}) as any);
              const barioLeadId = typeof resBody?.bario_one_lead_id === "string" ? resBody.bario_one_lead_id : null;

              await supabase.from("bario_lead_sync_log").insert({
                message_id: String(msg.msg_id),
                event_type,
                application_id,
                status: "sent",
                response_status: res.status,
              });
              await supabase
                .from("bario_sync_records")
                .update({ status: "synced", bario_lead_id: barioLeadId, updated_at: new Date().toISOString() })
                .eq("application_id", application_id);
              await recordActivity(supabase, application_id, "Bario One synchronization completed");
              await supabase.rpc("delete_bario_lead_sync", { queue_name: queue, msg_id: msg.msg_id });
              processed++;
            } else {
              const text = await res.text().catch(() => "");
              await supabase.from("bario_lead_sync_log").insert({
                message_id: String(msg.msg_id),
                event_type,
                application_id,
                status: "failed",
                response_status: res.status,
                error_message: text.slice(0, 1000),
              });
              await supabase
                .from("bario_sync_records")
                .update({ status: "retrying", last_error: text.slice(0, 1000), updated_at: new Date().toISOString() })
                .eq("application_id", application_id);
              // Message stays in queue; VT expires and it's retried next tick.
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            await supabase.from("bario_lead_sync_log").insert({
              message_id: String(msg.msg_id),
              event_type,
              application_id,
              status: "failed",
              error_message: errorMsg.slice(0, 1000),
            });
            await supabase
              .from("bario_sync_records")
              .update({ status: "retrying", last_error: errorMsg.slice(0, 1000), updated_at: new Date().toISOString() })
              .eq("application_id", application_id);
          }

          if (i < messages.length - 1) await new Promise((r) => setTimeout(r, sendDelayMs));
        }

        return Response.json({ processed });
      },
    },
  },
});
