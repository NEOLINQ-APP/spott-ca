// REST: /api/listings
// GET  → unified listing feed (public)
// POST → create a marketplace listing (auth required)
//
// Was 100% broken in both directions since whenever this was written: it
// selected/inserted a flat `category` text column and an `images` array
// column that have never existed on marketplace_listings -- the real
// schema uses `category_id` (FK to marketplace_categories) and a separate
// marketplace_listing_photos table (same relational shape the web
// composer at /marketplace/new already uses). GET 500'd on every call
// ("column marketplace_listings.images does not exist") and POST 400'd on
// every call ("Could not find the 'category' column ... in the schema
// cache") -- confirmed live, and confirmed zero rows ever existed for the
// only account that had attempted to post through this API. Fixed to use
// the real columns while keeping the same flat `category`/`images`
// request/response shape external callers already expect.
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";
import { resolveStoredUrl } from "@/lib/barioStorageUrl";

async function attachPhotosAndCategory(
  supabase: any,
  rows: { id: string; category_id: string | null }[]
): Promise<{ photosByListing: Record<string, string[]>; categoryById: Record<string, { name: string; slug: string }> }> {
  const photosByListing: Record<string, string[]> = {};
  const categoryById: Record<string, { name: string; slug: string }> = {};
  if (!rows.length) return { photosByListing, categoryById };

  const listingIds = rows.map((r) => r.id);
  const categoryIds = [...new Set(rows.map((r) => r.category_id).filter((v): v is string => !!v))];

  const [{ data: photos }, { data: cats }] = await Promise.all([
    supabase
      .from("marketplace_listing_photos")
      .select("listing_id,storage_path,sort_order")
      .in("listing_id", listingIds)
      .order("sort_order"),
    categoryIds.length
      ? supabase.from("marketplace_categories").select("id,name,slug").in("id", categoryIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  (photos ?? []).forEach((p: any) => {
    (photosByListing[p.listing_id] ??= []).push(resolveStoredUrl(p.storage_path));
  });
  (cats ?? []).forEach((c: any) => {
    categoryById[c.id] = { name: c.name, slug: c.slug };
  });

  return { photosByListing, categoryById };
}

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
          .select("id,title,description,price_cents,currency,city,category_id,user_id,status,created_at,view_count,is_featured,is_boosted", { count: "exact" })
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

        const rows = data ?? [];
        const { photosByListing, categoryById } = await attachPhotosAndCategory(supabaseAdmin, rows);
        const enriched = rows.map((r: any) => ({
          ...r,
          images: photosByListing[r.id] ?? [],
          category: r.category_id ? categoryById[r.category_id]?.slug ?? null : null,
        }));

        return jsonResponse({ data: enriched, count, limit, offset, section });
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

        let categoryId: string | null = null;
        if (body.category) {
          const { data: cat } = await auth.supabase
            .from("marketplace_categories")
            .select("id")
            .eq("slug", body.category)
            .maybeSingle();
          if (!cat) return errorResponse(400, `Unknown category: ${body.category}`);
          categoryId = cat.id;
        }

        const { data: listing, error } = await auth.supabase
          .from("marketplace_listings")
          .insert({
            user_id: auth.userId,
            title: body.title,
            description: body.description ?? null,
            price_cents: body.price_cents,
            currency: body.currency ?? "CAD",
            category_id: categoryId,
            city: body.city ?? null,
            tags: body.tags ?? [],
            status: "active",
          } as never)
          .select("id")
          .single();

        if (error) return errorResponse(400, error.message);

        let photoErrors = 0;
        const images = (body.images ?? []).filter(Boolean);
        if (images.length) {
          const { error: photoErr } = await auth.supabase.from("marketplace_listing_photos").insert(
            images.map((url, i) => ({ listing_id: (listing as any).id, storage_path: url, sort_order: i }))
          );
          if (photoErr) photoErrors = images.length;
        }

        return jsonResponse(
          {
            data: {
              id: (listing as any).id,
              title: body.title,
              description: body.description ?? null,
              price_cents: body.price_cents,
              currency: body.currency ?? "CAD",
              category: body.category ?? null,
              city: body.city ?? null,
              images: photoErrors ? [] : images,
              status: "active",
            },
            ...(photoErrors ? { warning: "Listing created, but photos failed to save" } : {}),
          },
          { status: 201 }
        );
      },
    },
  },
});
