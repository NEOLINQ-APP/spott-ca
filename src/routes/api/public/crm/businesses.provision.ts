// POST /api/public/crm/businesses/provision — the D4 exception: creating a
// BRAND-NEW Spott listing from BARIO skips the human-approval flow entirely
// (nothing else could have owned it a moment ago). Still goes through
// Spott's normal moderation pipeline (status='pending', is_claimed=false).
// Partner-secret gated (server-to-server, no per-business key exists yet —
// this call is what creates one).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, errorResponse, readJsonBody } from "@/lib/api/http.server";
import { requireCrmPartnerSecret, generateApiKey, generateWebhookSigningSecret, sha256Hex, isResponse } from "@/lib/api/crm-auth.server";
import { slugify } from "@/lib/ingest/normalize";

// No human approves a provision — see D4 above. This constant marks that
// explicitly in crm_integrations.approved_by_user_id rather than storing a
// fabricated human id.
const SYSTEM_PROVISION_ACTOR = "00000000-0000-0000-0000-000000000000";

const ProvisionInput = z.object({
  requesting_org_id: z.string().trim().min(1).max(200),
  requesting_org_name: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(60),
  address: z.string().trim().max(300).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().email().max(255).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
});

export const Route = createFileRoute("/api/public/crm/businesses/provision")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = requireCrmPartnerSecret(request);
        if (authError) return authError;

        const body = await readJsonBody(request);
        if (isResponse(body)) return body;
        let data: z.infer<typeof ProvisionInput>;
        try {
          data = ProvisionInput.parse(body);
        } catch (e) {
          return errorResponse(400, (e as Error).message);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: biz, error: bizError } = await supabaseAdmin
          .from("businesses")
          .insert({
            name: data.name,
            slug: slugify(data.name),
            description: data.description ?? null,
            city: data.city,
            province: data.province,
            address: data.address ?? null,
            phone: data.phone ?? null,
            email: data.email ?? null,
            website: data.website ?? null,
            category_id: data.category_id ?? null,
            status: "pending",
            is_claimed: false,
            owner_id: null,
            source: "bario_crm",
            source_ref: data.requesting_org_id,
          })
          .select("id, slug")
          .single();
        if (bizError) return errorResponse(400, bizError.message);

        const { key, prefix } = generateApiKey();
        const webhookSigningSecret = generateWebhookSigningSecret();
        const apiKeyHash = await sha256Hex(key);

        const { data: integration, error: integrationError } = await supabaseAdmin
          .from("crm_integrations")
          .insert({
            business_id: biz.id,
            external_org_id: data.requesting_org_id,
            external_org_name: data.requesting_org_name,
            api_key_hash: apiKeyHash,
            api_key_prefix: prefix,
            webhook_signing_secret: webhookSigningSecret,
            status: "active",
            approved_by_user_id: SYSTEM_PROVISION_ACTOR,
          })
          .select("id")
          .single();
        if (integrationError) return errorResponse(500, integrationError.message);

        return jsonResponse({
          business_id: biz.id,
          public_url: `https://www.spott.ca/business/${biz.slug}`,
          integration_id: integration.id,
          api_key: key,
          webhook_signing_secret: webhookSigningSecret,
        });
      },
    },
  },
});
