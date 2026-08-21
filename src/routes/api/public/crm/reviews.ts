// GET /api/public/crm/reviews — bearer API key. Real review data only
// (rating/body/owner_reply) — reviews.owner_reply/owner_reply_at are real
// columns on Spott's reviews table, confirmed against the live schema.
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, errorResponse } from "@/lib/api/http.server";
import { requireCrmApiKey, isResponse } from "@/lib/api/crm-auth.server";

export const Route = createFileRoute("/api/public/crm/reviews")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("reviews")
          .select("id, rating, body, owner_reply, owner_reply_at, created_at")
          .eq("business_id", auth.businessId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ reviews: data ?? [] });
      },
    },
  },
});
