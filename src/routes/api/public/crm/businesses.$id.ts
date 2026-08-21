// GET/PATCH /api/public/crm/businesses/:id — bearer API key (per-business,
// see crm-auth.server.ts). PATCH is a real write to Spott's authoritative
// businesses row, then enqueues a `listing.updated` webhook so BARIO's own
// cache (spott_listings) only updates once it hears back — BARIO never
// assumes its own PATCH landed just because the HTTP call returned 200.
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, errorResponse, readJsonBody } from "@/lib/api/http.server";
import { requireCrmApiKey, isResponse } from "@/lib/api/crm-auth.server";

const EDITABLE_FIELDS = ["description", "phone", "email", "website", "address", "hours"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export const Route = createFileRoute("/api/public/crm/businesses/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;
        if (auth.businessId !== params.id) return errorResponse(403, "API key does not match this business");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("businesses")
          .select("id, slug, name, description, phone, email, website, address, city, province, hero_image_url, hours, status, is_claimed")
          .eq("id", params.id)
          .single();
        if (error) return errorResponse(404, "Business not found");

        return jsonResponse({
          ...data,
          public_url: `https://www.spott.ca/business/${data.slug}`,
        });
      },

      PATCH: async ({ request, params }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;
        if (auth.businessId !== params.id) return errorResponse(403, "API key does not match this business");

        const body = await readJsonBody<Record<string, unknown>>(request);
        if (isResponse(body)) return body;

        const patch: Partial<Record<EditableField, unknown>> = {};
        for (const field of EDITABLE_FIELDS) {
          if (field in body) patch[field] = body[field];
        }
        if (Object.keys(patch).length === 0) return errorResponse(400, "No editable fields provided");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("businesses")
          .update({ ...patch, updated_at: new Date().toISOString() } as never)
          .eq("id", params.id)
          .select("id, slug, name, description, phone, email, website, address, city, province, hero_image_url, hours, status, is_claimed")
          .single();
        if (error) return errorResponse(400, error.message);

        try {
          await supabaseAdmin.rpc("enqueue_crm_webhook", {
            queue_name: "crm_webhooks",
            payload: {
              event_type: "listing.updated",
              business_id: params.id,
              queued_at: new Date().toISOString(),
            },
          });
        } catch (e) {
          console.error("listing.updated enqueue failed", params.id, (e as Error).message);
        }

        return jsonResponse({
          ...data,
          public_url: `https://www.spott.ca/business/${data.slug}`,
        });
      },
    },
  },
});
