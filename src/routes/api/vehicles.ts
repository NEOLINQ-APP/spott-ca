// REST: /api/vehicles
// GET  → vehicle listings (public, filterable)
// POST → create a vehicle listing (auth)
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

export const Route = createFileRoute("/api/vehicles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const p = url.searchParams;
        const limit = Math.min(Number(p.get("limit") ?? 24), 100);
        const offset = Math.max(Number(p.get("offset") ?? 0), 0);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("vehicles")
          .select("*", { count: "exact" })
          .eq("status", "active")
          .range(offset, offset + limit - 1);

        const sellerType = p.get("seller_type");
        if (sellerType) q = q.eq("seller_type", sellerType);
        const make = p.get("make"); if (make) q = q.ilike("make", make);
        const model = p.get("model"); if (model) q = q.ilike("model", model);
        const yearMin = p.get("year_min"); if (yearMin) q = q.gte("year", Number(yearMin));
        const yearMax = p.get("year_max"); if (yearMax) q = q.lte("year", Number(yearMax));
        const priceMin = p.get("price_min"); if (priceMin) q = q.gte("price_cents", Number(priceMin));
        const priceMax = p.get("price_max"); if (priceMax) q = q.lte("price_cents", Number(priceMax));
        const mileageMax = p.get("mileage_max"); if (mileageMax) q = q.lte("mileage_km", Number(mileageMax));
        const condition = p.get("condition"); if (condition) q = q.eq("condition", condition);
        const search = p.get("search");
        if (search) q = q.or(`make.ilike.%${search}%,model.ilike.%${search}%,title.ilike.%${search}%`);

        const sort = p.get("sort") ?? "newest";
        switch (sort) {
          case "price_asc": q = q.order("price_cents", { ascending: true }); break;
          case "price_desc": q = q.order("price_cents", { ascending: false }); break;
          case "mileage_asc": q = q.order("mileage_km", { ascending: true }); break;
          case "year_desc": q = q.order("year", { ascending: false }); break;
          case "featured_first": q = q.order("is_featured", { ascending: false }).order("created_at", { ascending: false }); break;
          default: q = q.order("created_at", { ascending: false });
        }

        const { data, count, error } = await q;
        if (error) return errorResponse(500, error.message);
        return jsonResponse({ data, count, limit, offset });
      },

      POST: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<Record<string, unknown>>(request);
        if (isResponse(body)) return body;

        const { data, error } = await auth.supabase
          .from("vehicles")
          .insert({ ...body, seller_id: auth.userId, status: "active" } as never)
          .select()
          .single();
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ data }, { status: 201 });
      },
    },
  },
});
