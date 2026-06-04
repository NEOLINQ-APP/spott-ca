// REST: /api/listings/$id
// GET    → single listing (public)
// PATCH  → update own listing (auth)
// DELETE → delete own listing (auth)
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

export const Route = createFileRoute("/api/listings/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("marketplace_listings")
          .select("*")
          .eq("id", params.id)
          .eq("status", "active")
          .maybeSingle();
        if (error) return errorResponse(500, error.message);
        if (!data) return errorResponse(404, "Listing not found");
        return jsonResponse({ data });
      },

      PATCH: async ({ request, params }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<Record<string, unknown>>(request);
        if (isResponse(body)) return body;

        const { data, error } = await auth.supabase
          .from("marketplace_listings")
          .update(body as never)
          .eq("id", params.id)
          .eq("user_id", auth.userId)
          .select()
          .maybeSingle();
        if (error) return errorResponse(400, error.message);
        if (!data) return errorResponse(404, "Listing not found or not owned");
        return jsonResponse({ data });
      },

      DELETE: async ({ request, params }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const { error } = await auth.supabase
          .from("marketplace_listings")
          .delete()
          .eq("id", params.id)
          .eq("user_id", auth.userId);
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ ok: true });
      },
    },
  },
});
