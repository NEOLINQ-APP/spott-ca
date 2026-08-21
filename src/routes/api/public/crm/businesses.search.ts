// GET /api/public/crm/businesses/search?q=<name or city>
// Public, unauthenticated (BARIO calls this before any connection exists),
// but deliberately narrow: only enough fields to let a BARIO admin pick
// the right listing to request a connection to. No contact info, no
// internal ids beyond the business id itself.
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, errorResponse } from "@/lib/api/http.server";
import { clientIp, isRateLimited } from "@/lib/api/rate-limit.server";

export const Route = createFileRoute("/api/public/crm/businesses/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (isRateLimited(`crm-search:${clientIp(request)}`, 20, 60_000)) {
          return errorResponse(429, "Too many requests");
        }

        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (q.length < 2) return jsonResponse({ results: [] });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("businesses")
          .select("id, name, city, province, address, is_claimed")
          .eq("status", "approved")
          .or(`name.ilike.%${q.replace(/[%_]/g, "")}%,city.ilike.%${q.replace(/[%_]/g, "")}%`)
          .limit(10);
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ results: data ?? [] });
      },
    },
  },
});
