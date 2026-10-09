import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  province: z.string().min(2).max(2),
  city: z.string().min(1).max(120).optional(),
});

export interface LocationListing {
  id: string;
  title: string;
  price_cents: number | null;
  currency: string | null;
  city: string | null;
  province: string | null;
  listing_type: string | null;
  created_at: string;
}

export interface MarketplaceLocationData {
  total: number;
  listings: LocationListing[];
}

// Public, read-only list of active marketplace listings for a province or
// city landing page. Selects only non-sensitive columns (no contact info).
export const getMarketplaceLocationData = createServerFn({ method: "GET" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }): Promise<MarketplaceLocationData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("marketplace_listings")
      .select("id,title,price_cents,currency,city,province,listing_type,created_at", { count: "exact" })
      .eq("status", "active")
      .eq("province", data.province);
    if (data.city) q = q.ilike("city", data.city);
    const { data: rows, count } = await q.order("created_at", { ascending: false }).limit(48);
    return { total: count ?? rows?.length ?? 0, listings: (rows ?? []) as LocationListing[] };
  });
