// POST /api/public/crm/reviews/:id/reply — bearer API key. Lets a
// connected BARIO CRM reply to a review on behalf of the business owner.
// reviews.owner_reply/owner_reply_at are real columns (confirmed against
// the live schema/migration) — this was scoped out of the original plan
// as "read-only, no reply UI" on an incorrect earlier finding; it's real
// and buildable, so it's built here rather than left unsupported.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, errorResponse, readJsonBody } from "@/lib/api/http.server";
import { requireCrmApiKey, isResponse } from "@/lib/api/crm-auth.server";

const ReplyInput = z.object({ reply: z.string().trim().min(1).max(2000) });

export const Route = createFileRoute("/api/public/crm/reviews/$id/reply")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireCrmApiKey(request);
        if (isResponse(auth)) return auth;

        const body = await readJsonBody(request);
        if (isResponse(body)) return body;
        let data: z.infer<typeof ReplyInput>;
        try {
          data = ReplyInput.parse(body);
        } catch (e) {
          return errorResponse(400, (e as Error).message);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: review, error: findError } = await supabaseAdmin
          .from("reviews")
          .select("id, business_id")
          .eq("id", params.id)
          .single();
        if (findError || !review) return errorResponse(404, "Review not found");
        if (review.business_id !== auth.businessId) return errorResponse(403, "Review does not belong to this business");

        const { data: updated, error } = await supabaseAdmin
          .from("reviews")
          .update({ owner_reply: data.reply, owner_reply_at: new Date().toISOString() })
          .eq("id", params.id)
          .select("id, rating, body, owner_reply, owner_reply_at, created_at")
          .single();
        if (error) return errorResponse(400, error.message);

        return jsonResponse(updated);
      },
    },
  },
});
