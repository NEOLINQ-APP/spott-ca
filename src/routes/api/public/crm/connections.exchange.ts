// POST /api/public/crm/connections/exchange — BARIO's admin enters the
// short code the real Spott owner approved; BARIO's server exchanges it
// here for the real API key + webhook secret. This is the ONLY moment
// either exists in plaintext outside the DB — never returned to, or
// rendered by, any browser. Partner-secret gated + rate-limited (this is
// a code-guessing surface, even though the code is single-use and expires
// in 10 minutes).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, errorResponse, readJsonBody } from "@/lib/api/http.server";
import { requireCrmPartnerSecret, isResponse, generateApiKey, generateWebhookSigningSecret, sha256Hex } from "@/lib/api/crm-auth.server";
import { clientIp, isRateLimited } from "@/lib/api/rate-limit.server";

const ExchangeInput = z.object({
  request_id: z.string().uuid(),
  code: z.string().trim().min(4).max(16),
});

export const Route = createFileRoute("/api/public/crm/connections/exchange")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = requireCrmPartnerSecret(request);
        if (authError) return authError;

        if (isRateLimited(`crm-exchange:${clientIp(request)}`, 10, 60_000)) {
          return errorResponse(429, "Too many requests");
        }

        const body = await readJsonBody(request);
        if (isResponse(body)) return body;
        let data: z.infer<typeof ExchangeInput>;
        try {
          data = ExchangeInput.parse(body);
        } catch (e) {
          return errorResponse(400, (e as Error).message);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: reqRow, error: reqError } = await supabaseAdmin
          .from("crm_connection_requests")
          .select("id, business_id, requesting_org_id, requesting_org_name, status, connection_code, connection_code_expires_at, approved_by_user_id")
          .eq("id", data.request_id)
          .single();
        if (reqError || !reqRow) return errorResponse(404, "Request not found");
        if (reqRow.status !== "approved") return errorResponse(409, `Request is ${reqRow.status}, not approved`);
        if (!reqRow.connection_code || !reqRow.connection_code_expires_at) {
          return errorResponse(409, "No active code for this request");
        }
        if (new Date(reqRow.connection_code_expires_at) < new Date()) {
          return errorResponse(410, "Code has expired");
        }
        if (reqRow.connection_code !== data.code.trim().toUpperCase()) {
          return errorResponse(401, "Invalid code");
        }

        const { key, prefix } = generateApiKey();
        const webhookSigningSecret = generateWebhookSigningSecret();
        const apiKeyHash = await sha256Hex(key);

        // Replace any prior integration for this business (a re-connect
        // after disconnect) rather than erroring on the UNIQUE constraint.
        const { data: integration, error: integrationError } = await supabaseAdmin
          .from("crm_integrations")
          .upsert(
            {
              business_id: reqRow.business_id,
              external_org_id: reqRow.requesting_org_id,
              external_org_name: reqRow.requesting_org_name,
              api_key_hash: apiKeyHash,
              api_key_prefix: prefix,
              webhook_signing_secret: webhookSigningSecret,
              status: "active",
              approved_by_user_id: reqRow.approved_by_user_id,
              revoked_at: null,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: "business_id" },
          )
          .select("id")
          .single();
        if (integrationError) return errorResponse(500, integrationError.message);

        await supabaseAdmin
          .from("crm_connection_requests")
          .update({ status: "exchanged" })
          .eq("id", reqRow.id);

        const { data: biz } = await supabaseAdmin
          .from("businesses")
          .select("slug, name")
          .eq("id", reqRow.business_id)
          .single();

        return jsonResponse({
          business_id: reqRow.business_id,
          business_name: biz?.name ?? null,
          public_url: biz ? `https://www.spott.ca/business/${biz.slug}` : null,
          integration_id: integration.id,
          api_key: key,
          webhook_signing_secret: webhookSigningSecret,
        });
      },
    },
  },
});
