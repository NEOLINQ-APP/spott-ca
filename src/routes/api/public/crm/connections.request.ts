// POST /api/public/crm/connections/request — BARIO backend asks to connect
// to a pre-existing Spott listing. Server-to-server only (partner secret).
// Never approves anything itself — just creates the pending request and
// emails the real, logged-in Spott owner. See D4 in the plan: this is the
// "claim a pre-existing listing" path, which always needs a human.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, errorResponse, readJsonBody } from "@/lib/api/http.server";
import { requireCrmPartnerSecret, isResponse } from "@/lib/api/crm-auth.server";
import { sendCrmConnectionRequestEmail } from "@/lib/crm-connections.functions";

const RequestInput = z.object({
  business_id: z.string().uuid(),
  requesting_org_id: z.string().trim().min(1).max(200),
  requesting_org_name: z.string().trim().min(1).max(200),
  requesting_contact_email: z.string().trim().email().max(255),
});

export const Route = createFileRoute("/api/public/crm/connections/request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = requireCrmPartnerSecret(request);
        if (authError) return authError;

        const body = await readJsonBody(request);
        if (isResponse(body)) return body;
        let data: z.infer<typeof RequestInput>;
        try {
          data = RequestInput.parse(body);
        } catch (e) {
          return errorResponse(400, (e as Error).message);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: biz, error: bizError } = await supabaseAdmin
          .from("businesses")
          .select("id, owner_id, is_claimed")
          .eq("id", data.business_id)
          .single();
        if (bizError || !biz) return errorResponse(404, "Business not found");
        if (!biz.is_claimed || !biz.owner_id) {
          return errorResponse(409, "This listing has no owner yet — use businesses/provision instead");
        }

        // One pending request per (business, requesting org) at a time —
        // re-requesting just returns the existing pending row rather than
        // spamming the owner with duplicate emails.
        const { data: existing } = await supabaseAdmin
          .from("crm_connection_requests")
          .select("id, status")
          .eq("business_id", data.business_id)
          .eq("requesting_org_id", data.requesting_org_id)
          .eq("status", "pending")
          .maybeSingle();
        if (existing) {
          return jsonResponse({ request_id: existing.id, status: "pending", already_requested: true });
        }

        const { data: reqRow, error: reqError } = await supabaseAdmin
          .from("crm_connection_requests")
          .insert({
            business_id: data.business_id,
            requesting_org_id: data.requesting_org_id,
            requesting_org_name: data.requesting_org_name,
            requesting_contact_email: data.requesting_contact_email,
          })
          .select("id")
          .single();
        if (reqError) return errorResponse(500, reqError.message);

        try {
          const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(biz.owner_id);
          const ownerEmail = ownerAuth?.user?.email;
          if (ownerEmail) {
            await sendCrmConnectionRequestEmail(ownerEmail, data.requesting_org_name, reqRow.id);
          }
        } catch (e) {
          console.error("crm connection request email failed", reqRow.id, (e as Error).message);
        }

        return jsonResponse({ request_id: reqRow.id, status: "pending", already_requested: false });
      },
    },
  },
});
