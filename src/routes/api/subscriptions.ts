// REST: /api/subscriptions
// GET → current user's dealer subscription (auth)
import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, isResponse, jsonResponse, requireBearerAuth } from "@/lib/api/http.server";

export const Route = createFileRoute("/api/subscriptions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;

        // Find businesses owned by this user
        const { data: businesses, error: bErr } = await auth.supabase
          .from("businesses")
          .select("id,name,slug")
          .eq("owner_id", auth.userId);
        if (bErr) return errorResponse(500, bErr.message);

        const businessIds = (businesses ?? []).map((b) => b.id);
        if (businessIds.length === 0) {
          return jsonResponse({ subscriptions: [], businesses: [] });
        }

        const { data: subs, error: sErr } = await auth.supabase
          .from("dealer_subscriptions")
          .select("*, plan:subscription_plans(*)")
          .in("business_id", businessIds)
          .order("created_at", { ascending: false });
        if (sErr) return errorResponse(500, sErr.message);

        return jsonResponse({ subscriptions: subs ?? [], businesses });
      },
    },
  },
});
