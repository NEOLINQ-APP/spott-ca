// REST: /api/listings/$id
// GET    → single listing (public, contact fields excluded)
// PATCH  → update own listing (auth, allowlisted fields)
// DELETE → delete own listing (auth)
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

// Safe public columns — contact_email/contact_phone are intentionally excluded.
// Contact details are released only through the get_listing_contact() server
// function, which requires an authenticated caller and an active listing.
const LISTING_PUBLIC_COLUMNS =
  "id,user_id,title,description,price_cents,currency,city,province,country,postal_code,status,is_featured,is_boosted,boost_score,featured_until,boosted_until,view_count,tags,category_id,condition,created_at,updated_at";

// Fields a seller may modify on their own listing. Promotion-related fields
// (is_featured, is_boosted, boost_score, featured_until, boosted_until) and
// view_count are intentionally excluded — set by admin tools / payment flows.
const LISTING_UPDATABLE_FIELDS = [
  "title",
  "description",
  "price_cents",
  "currency",
  "city",
  "province",
  "country",
  "postal_code",
  "status",
  "tags",
  "category_id",
  "condition",
  "contact_email",
  "contact_phone",
  "contact_pref",
] as const;

function pickListingFields(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  for (const k of LISTING_UPDATABLE_FIELDS) {
    if (k in body) patch[k] = body[k as string];
  }
  if ("status" in patch) {
    const s = patch.status;
    if (s !== "active" && s !== "sold" && s !== "inactive" && s !== "draft") {
      delete patch.status;
    }
  }
  return patch;
}

export const Route = createFileRoute("/api/listings/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("marketplace_listings")
          .select(LISTING_PUBLIC_COLUMNS)
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

        const patch = pickListingFields(body);
        if (Object.keys(patch).length === 0) {
          return errorResponse(400, "No updatable fields provided");
        }

        const { data, error } = await auth.supabase
          .from("marketplace_listings")
          .update(patch as never)
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
