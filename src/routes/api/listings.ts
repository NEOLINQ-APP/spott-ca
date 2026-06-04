// REST: /api/listings
// GET  → unified listing feed (public)
// POST → create a marketplace listing (auth required)
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

export const Route = createFileRoute("/api/listings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const params = url.searchParams;
        const limit = Math.min(Number(params.get("limit") ?? 24), 100);
        const offset = Math.max(Number(params.get("offset") ?? 0), 0);
        const section = params.get("section") ?? "all";
        const search = params.get("search") ?? undefined;
        const city = params.get("city") ?? undefined;
        const minPrice = params.get("min_price") ? Number(params.get("min_price")) : undefined;
        const maxPrice = params.get("max_price") ? Number(params.get("max_price")) : undefined;
        const sort = params.get("sort") ?? "newest";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let query = supabaseAdmin
          .from("marketplace_listings")
          .select("id,title,description,price_cents,currency,city,images,user_id,status,created_at,view_count,is_featured,is_boosted,category", { count: "exact" })
          .eq("status", "active")
          .range(offset, offset + limit - 1);

        if (search) query = query.ilike("title", `%${search}%`);
        if (city) query = query.ilike("city", `%${city}%`);
        if (typeof minPrice === "number") query = query.gte("price_cents", minPrice);
        if (typeof maxPrice === "number") query = query.lte("price_cents", maxPrice);

        switch (sort) {
          case "price_asc": query = query.order("price_cents", { ascending: true }); break;
          case "price_desc": query = query.order("price_cents", { ascending: false }); break;
          case "most_viewed": query = query.order("view_count", { ascending: false }); break;
          case "featured_first": query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false }); break;
          case "oldest": query = query.order("created_at", { ascending: true }); break;
          default: query = query.order("created_at", { ascending: false });
        }

        const { data, count, error } = await query;
        if (error) return errorResponse(500, error.message);
        return jsonResponse({ data, count, limit, offset, section });
      },

      POST: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<{
          title: string;
          description?: string;
          price_cents: number;
          currency?: string;
          category?: string;
          city?: string;
          images?: string[];
          tags?: string[];
        }>(request);
        if (isResponse(body)) return body;

        if (!body.title || typeof body.price_cents !== "number") {
          return errorResponse(400, "title and price_cents are required");
        }

        const { data, error } = await auth.supabase
          .from("marketplace_listings")
          .insert({
            user_id: auth.userId,
            title: body.title,
            description: body.description ?? null,
            price_cents: body.price_cents,
            currency: body.currency ?? "CAD",
            category: body.category ?? null,
            city: body.city ?? null,
            images: body.images ?? [],
            tags: body.tags ?? [],
            status: "active",
          } as never)
          .select()
          .single();

        if (error) return errorResponse(400, error.message);
        return jsonResponse({ data }, { status: 201 });
      },
    },
  },
});
