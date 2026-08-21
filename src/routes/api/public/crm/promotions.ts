// GET/POST /api/public/crm/promotions — bearer API key. Lets a connected
// BARIO CRM create a real consumer-facing offer on the business's Spott
// listing (spott_promotions, created_via='bario_crm') and list existing
// ones for its own promotions page.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, errorResponse, readJsonBody } from "@/lib/api/http.server";
import { requireCrmApiKey, isResponse } from "@/lib/api/crm-auth.server";

const PromotionInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

export const Route = createFileRoute("/api/public/crm/promotions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("spott_promotions")
          .select("id, title, description, starts_at, ends_at, status, created_via, created_at, updated_at")
          .eq("business_id", auth.businessId)
          .order("created_at", { ascending: false });
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ promotions: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;

        const body = await readJsonBody(request);
        if (isResponse(body)) return body;
        let data: z.infer<typeof PromotionInput>;
        try {
          data = PromotionInput.parse(body);
        } catch (e) {
          return errorResponse(400, (e as Error).message);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: promo, error } = await supabaseAdmin
          .from("spott_promotions")
          .insert({
            business_id: auth.businessId,
            title: data.title,
            description: data.description ?? null,
            starts_at: data.starts_at ?? null,
            ends_at: data.ends_at ?? null,
            created_via: "bario_crm",
          })
          .select("id, title, description, starts_at, ends_at, status, created_via, created_at, updated_at")
          .single();
        if (error) return errorResponse(400, error.message);

        return jsonResponse(promo);
      },
    },
  },
});
