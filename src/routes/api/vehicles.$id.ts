// REST: /api/vehicles/$id
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

// Fields a seller may modify on their own vehicle listing.
// Privileged fields (is_featured, is_boosted, boost_score, featured_until,
// boosted_until, dealer_business_id, seller_id, view_count) are intentionally
// excluded — those can only be set by admin tools or server-side payment flows.
const VEHICLE_UPDATABLE_FIELDS = [
  "title",
  "description",
  "make",
  "model",
  "trim",
  "year",
  "price_cents",
  "currency",
  "mileage_km",
  "condition",
  "body_style",
  "fuel_type",
  "transmission",
  "drivetrain",
  "exterior_color",
  "interior_color",
  "doors",
  "seats",
  "vin",
  "city",
  "province",
  "country",
  "postal_code",
  "contact_email",
  "contact_phone",
  "contact_pref",
  "accident_history",
  "clean_title",
  "rebuilt_status",
  "financing_available",
  "warranty_available",
  "hashtags",
  "features",
  "category_id",
  "status",
] as const;

function pickVehicleFields(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const k of VEHICLE_UPDATABLE_FIELDS) {
    if (k in body) patch[k] = body[k as string];
  }
  // Only allow status transitions to seller-safe values
  if ("status" in patch) {
    const s = patch.status;
    if (s !== "active" && s !== "sold" && s !== "inactive" && s !== "draft") {
      delete patch.status;
    }
  }
  return patch;
}

export const Route = createFileRoute("/api/vehicles/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("vehicles")
          .select("*")
          .eq("id", params.id)
          .maybeSingle();
        if (error) return errorResponse(500, error.message);
        if (!data) return errorResponse(404, "Vehicle not found");

        // Only active listings are public. Non-active listings are visible
        // to the seller (and admins) — authenticate before returning them.
        if (data.status !== "active") {
          const auth = await requireBearerAuth(request);
          if (isResponse(auth)) return errorResponse(404, "Vehicle not found");
          const { data: roles } = await auth.supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", auth.userId);
          const isAdmin = (roles ?? []).some((r) => r.role === "admin");
          if (data.seller_id !== auth.userId && !isAdmin) {
            return errorResponse(404, "Vehicle not found");
          }
        }
        return jsonResponse({ data });
      },

      PATCH: async ({ request, params }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<Record<string, unknown>>(request);
        if (isResponse(body)) return body;

        const patch = pickVehicleFields(body);
        if (Object.keys(patch).length === 0) {
          return errorResponse(400, "No updatable fields provided");
        }

        const { data, error } = await auth.supabase
          .from("vehicles")
          .update(patch as never)
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
