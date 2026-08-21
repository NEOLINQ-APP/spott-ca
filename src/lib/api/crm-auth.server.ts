// Bearer-API-key auth for the BARIO CRM integration (`/api/public/crm/*`).
// Parallel to requireBearerAuth() in http.server.ts, but validates a
// per-business API key (crm_integrations.api_key_hash) instead of a
// Supabase user JWT — there is no Supabase session on the BARIO side.
import { errorResponse } from "@/lib/api/http.server";

export type CrmAuthedContext = {
  businessId: string;
  integrationId: string;
  externalOrgId: string;
};

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// sp_live_<40 hex chars>. Prefix is stored in the clear (crm_integrations.api_key_prefix)
// so a key can be identified/revoked in logs without ever storing it reversibly.
export function generateApiKey(): { key: string; prefix: string } {
  const token = randomToken(20);
  const key = `sp_live_${token}`;
  return { key, prefix: key.slice(0, 12) };
}

export function generateWebhookSigningSecret(): string {
  return `whsec_${randomToken(24)}`;
}

export async function requireCrmApiKey(request: Request): Promise<CrmAuthedContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return errorResponse(401, "Missing bearer API key");
  const key = match[1].trim();
  if (!key.startsWith("sp_live_")) return errorResponse(401, "Invalid API key");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const keyHash = await sha256Hex(key);

  const { data: integration, error } = await supabaseAdmin
    .from("crm_integrations")
    .select("id, business_id, external_org_id, status")
    .eq("api_key_hash", keyHash)
    .eq("status", "active")
    .maybeSingle();

  if (error || !integration) return errorResponse(401, "Invalid or revoked API key");

  return {
    businessId: integration.business_id,
    integrationId: integration.id,
    externalOrgId: integration.external_org_id,
  };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

// Server-to-server-only routes that run BEFORE a per-business API key
// exists (search, connection request/exchange, provisioning a brand-new
// listing) — gated by a single shared secret between BARIO's backend and
// Spott's backend, never exposed to a browser. Mirrors ingest-tick.ts's
// CRON_SECRET convention.
export function requireCrmPartnerSecret(request: Request): Response | null {
  const provided = request.headers.get("x-bario-partner-secret") ?? "";
  const expected = process.env.CRM_PARTNER_SECRET ?? "";
  if (!expected || !provided || provided !== expected) {
    return errorResponse(401, "Unauthorized");
  }
  return null;
}
