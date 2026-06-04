// REST: /api/vehicles/$id
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

export const Route = createFileRoute("/api/vehicles/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("vehicles")
          .select("*")
          .eq("id", params.id)
          .maybeSingle();
        if (error) return errorResponse(500, error.message);
        if (!data) return errorResponse(404, "Vehicle not found");
        return jsonResponse({ data });
      },

      PATCH: async ({ request, params }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<Record<string, unknown>>(request);
        if (isResponse(body)) return body;

        const { data, error } = await auth.supabase
          .from("vehicles")
          .update(body as never)
          .eq("id", params.id)
          .eq("seller_id", auth.userId)
          .select()
          .maybeSingle();
        if (error) return errorResponse(400, error.message);
        if (!data) return errorResponse(404, "Vehicle not found or not owned");
        return jsonResponse({ data });
      },

      DELETE: async ({ request, params }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const { error } = await auth.supabase
          .from("vehicles")
          .delete()
          .eq("id", params.id)
          .eq("seller_id", auth.userId);
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ ok: true });
      },
    },
  },
});
