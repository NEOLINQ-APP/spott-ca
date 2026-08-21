import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { notifyCrmConnectionRequest } from "@/lib/notifications.server";

// Excludes ambiguous characters (0/O, 1/I/L) — this code is read aloud/typed
// by a real person, not just machine-to-machine.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateConnectionCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export const getMyCrmConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ request_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("crm_connection_requests")
      .select("id, business_id, requesting_org_name, requesting_contact_email, status, created_at, expires_at, connection_code, connection_code_expires_at")
      .eq("id", data.request_id)
      .single();
    if (error || !req) throw new Error("Request not found");

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, name, owner_id")
      .eq("id", req.business_id)
      .single();
    if (!biz || biz.owner_id !== context.userId) throw new Error("Not your business");

    return {
      id: req.id,
      business_name: biz.name,
      requesting_org_name: req.requesting_org_name,
      requesting_contact_email: req.requesting_contact_email,
      status: req.status,
      created_at: req.created_at,
      expires_at: req.expires_at,
      // The code itself is only ever returned once, right after approval —
      // see approveCrmConnection's return value, not here.
      has_active_code: !!(req.connection_code && req.connection_code_expires_at && new Date(req.connection_code_expires_at) > new Date()),
    };
  });

export const approveCrmConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ request_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("crm_connection_requests")
      .select("id, business_id, status, expires_at")
      .eq("id", data.request_id)
      .single();
    if (error || !req) throw new Error("Request not found");

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id")
      .eq("id", req.business_id)
      .single();
    if (!biz || biz.owner_id !== context.userId) throw new Error("Not your business");
    if (req.status !== "pending") throw new Error(`Request is already ${req.status}`);
    if (new Date(req.expires_at) < new Date()) throw new Error("Request has expired");

    const code = generateConnectionCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("crm_connection_requests")
      .update({
        status: "approved",
        approved_by_user_id: context.userId,
        connection_code: code,
        connection_code_expires_at: codeExpiresAt,
      })
      .eq("id", req.id);
    if (updateError) throw new Error(updateError.message);

    return { code, expires_at: codeExpiresAt };
  });

export const denyCrmConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ request_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("crm_connection_requests")
      .select("id, business_id, status")
      .eq("id", data.request_id)
      .single();
    if (error || !req) throw new Error("Request not found");

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id")
      .eq("id", req.business_id)
      .single();
    if (!biz || biz.owner_id !== context.userId) throw new Error("Not your business");
    if (req.status !== "pending") throw new Error(`Request is already ${req.status}`);

    const { error: updateError } = await supabaseAdmin
      .from("crm_connection_requests")
      .update({ status: "denied", approved_by_user_id: context.userId })
      .eq("id", req.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });

// Called from the connections.request server route (not client-invokable) —
// exported so that route can reuse the same Brevo notification helper
// without duplicating the email copy.
export async function sendCrmConnectionRequestEmail(to: string, orgName: string, requestId: string) {
  return notifyCrmConnectionRequest(to, orgName, `https://www.spott.ca/crm-connect/${requestId}`);
}
