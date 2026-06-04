// REST: /api/subscriptions/plans
// GET → list available dealer subscription plans (public)
import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, jsonResponse } from "@/lib/api/http.server";

export const Route = createFileRoute("/api/subscriptions/plans")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("subscription_plans")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error) return errorResponse(500, error.message);
        return jsonResponse({ data });
      },
    },
  },
});
