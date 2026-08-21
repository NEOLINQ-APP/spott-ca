// GET /api/public/crm/leads?since=<ISO>&cursor=<id>&limit=<n> — bearer API
// key. BARIO's reconciliation safety net: even though leads are pushed via
// the webhook queue, this lets BARIO periodically pull anything it might
// have missed (a DLQ'd event, a webhook receiver outage) rather than
// trusting push delivery alone.
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, errorResponse } from "@/lib/api/http.server";
import { requireCrmApiKey, isResponse } from "@/lib/api/crm-auth.server";

export const Route = createFileRoute("/api/public/crm/leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;

        const url = new URL(request.url);
        const since = url.searchParams.get("since");
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("business_leads")
          .select("id, name, email, phone, message, source, promotion_id, utm_source, utm_medium, utm_campaign, landing_page, referrer, crm_sync_status, crm_synced_at, created_at")
          .eq("business_id", auth.businessId)
          .order("created_at", { ascending: true })
          .limit(limit);
        if (since) q = q.gte("created_at", since);

        const { data, error } = await q;
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ leads: data ?? [] });
      },
    },
  },
});
