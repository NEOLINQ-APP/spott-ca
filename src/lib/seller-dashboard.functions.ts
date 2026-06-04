// Server functions powering the unified seller dashboards. All data here is
// scoped to the signed-in user via requireSupabaseAuth.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Private seller panels ----------

export const getMyMarketplaceListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(
        "id,title,price_cents,currency,status,view_count,created_at,marketplace_listing_photos(storage_path,sort_order)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMySavedListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("marketplace_favorites")
      .select(
        "listing_id,created_at,marketplace_listings!inner(id,title,price_cents,currency,status,city,province,marketplace_listing_photos(storage_path,sort_order))",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyListingPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("id,title,view_count,status,created_at")
      .eq("user_id", userId)
      .order("view_count", { ascending: false })
      .limit(120);
    if (error) throw new Error(error.message);
    const totals = (data ?? []).reduce(
      (acc, r) => {
        acc.views += r.view_count ?? 0;
        if (r.status === "active") acc.active += 1;
        return acc;
      },
      { views: 0, active: 0, count: (data ?? []).length },
    );
    return { totals, items: data ?? [] };
  });
