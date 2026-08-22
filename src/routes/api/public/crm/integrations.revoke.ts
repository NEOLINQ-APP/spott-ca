// POST /api/public/crm/integrations/revoke — bearer API key. Self-revoke:
// BARIO calls this with the key it's about to stop using, right before
// deleting its own local copy, so a disconnect on the BARIO side reliably
// kills the Spott side too (rather than leaving an orphaned active key).
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, errorResponse } from "@/lib/api/http.server";
import { requireCrmApiKey, isResponse } from "@/lib/api/crm-auth.server";

export const Route = createFileRoute("/api/public/crm/integrations/revoke")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("crm_integrations")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("id", auth.integrationId);
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ ok: true });
      },
    },
  },
});
